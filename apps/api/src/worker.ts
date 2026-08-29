import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { configureExternalBusinessWorker } from "./worker-config";
import { writeWorkerHeartbeat } from "./worker-heartbeat";

configureExternalBusinessWorker();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger("ActivityWorker");
  const workerId = process.env.BUSINESS_JOB_WORKER_ID || String(process.pid);
  const startedAt = new Date().toISOString();
  const heartbeat = () => writeWorkerHeartbeat({ status: "ready", pid: process.pid, workerId, heartbeatAt: new Date().toISOString(), startedAt, commit: process.env.BUILD_COMMIT || "local" });
  const heartbeatTimer = setInterval(heartbeat, Math.max(5_000, Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 15_000)));
  heartbeatTimer.unref();
  heartbeat();
  logger.log(`Business worker ready: ${workerId}`);
  const shutdown = async (signal: string) => {
    logger.log(`Shutting down on ${signal}`);
    clearInterval(heartbeatTimer);
    writeWorkerHeartbeat({ status: "stopping", pid: process.pid, workerId, heartbeatAt: new Date().toISOString(), startedAt, commit: process.env.BUILD_COMMIT || "local" });
    await app.close();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap().catch((error) => {
  console.error("Activity worker failed to start", error);
  process.exitCode = 1;
});
