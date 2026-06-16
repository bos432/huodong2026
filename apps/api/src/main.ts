import "reflect-metadata";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import fs from "fs";
import { join } from "path";
import { AppModule } from "./modules/app.module";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { ApiResponseInterceptor } from "./shared/api-response.interceptor";
import { validateRuntimeConfig } from "./shared/config-validation";

function installerBootstrapMode(config: ConfigService) {
  return config.get<string>("INSTALLER_ENABLED", "false") === "true" && !fs.existsSync(join(process.cwd(), "runtime", "install.lock"));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const installing = installerBootstrapMode(config);
  if (!installing) validateRuntimeConfig(config);
  const origins = config.get<string>("CORS_ORIGIN", "").split(",").filter(Boolean);
  const production = config.get("NODE_ENV") === "production";
  const express = app.getHttpAdapter().getInstance();
  express.disable("x-powered-by");
  const trustProxy = config.get<string>("TRUST_PROXY", "false");
  if (trustProxy !== "false") express.set("trust proxy", trustProxy === "true" ? 1 : trustProxy);

  app.setGlobalPrefix("api", {
    exclude: [
      { path: "install", method: RequestMethod.GET },
      { path: "install.php", method: RequestMethod.GET }
    ]
  });
  app.useStaticAssets(join(process.cwd(), config.get<string>("UPLOAD_DIR", "uploads")), { prefix: "/uploads" });
  app.use((req: any, res: any, next: () => void) => {
    const incoming = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"].trim() : "";
    const requestId = incoming || randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });
  if (config.get("ACCESS_LOG_ENABLED", "true") === "true") {
    const skipHealth = config.get("ACCESS_LOG_SKIP_HEALTH", "true") === "true";
    app.use((req: any, res: any, next: () => void) => {
      const start = Date.now();
      res.on("finish", () => {
        if (skipHealth && req.path?.startsWith("/api/health")) return;
        console.log(JSON.stringify({
          type: "access",
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
          ip: req.ip,
          userAgent: req.headers["user-agent"] || null
        }));
      });
      next();
    });
  }
  if (config.get("SECURITY_HEADERS_ENABLED", "true") === "true") {
    app.use((_req: any, res: any, next: () => void) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      res.setHeader("X-XSS-Protection", "0");
      if (production && config.get("SECURITY_HSTS_ENABLED", "true") === "true") {
        res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
      }
      next();
    });
  }
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: config.get("VALIDATION_FORBID_NON_WHITELISTED", production ? "true" : "false") === "true",
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    validationError: { target: false, value: false }
  }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.listen(config.get<number>("API_PORT", 3000));
}

bootstrap();
