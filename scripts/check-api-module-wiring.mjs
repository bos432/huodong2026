import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/api/package.json'));
const runtime = path.join(root, '.local-logs', `module-wiring-${Date.now()}`);
fs.mkdirSync(runtime, { recursive: true });
process.chdir(runtime);
Object.assign(process.env, { NODE_ENV: 'development', JWT_SECRET: randomBytes(32).toString('hex'), DB_HOST: '127.0.0.1', DB_PORT: '1', DB_USERNAME: 'not-used', DB_PASSWORD: 'not-used', DB_DATABASE: 'not-used', DB_SYNCHRONIZE: 'false', REAL_PAYMENT_ENABLED: 'false', SMS_PROVIDER_ENABLED: 'false', WECHAT_MESSAGE_PROVIDER_ENABLED: 'false', BUSINESS_JOB_WORKER_ENABLED: 'false' });
const { DataSource } = require('typeorm');
const initialize = DataSource.prototype.initialize;
// Compile dependency injection only: no connection, app.init(), listener or workers.
DataSource.prototype.initialize = async function () { return this; };
let app;
try {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(path.join(root, 'apps/api/dist/modules/app.module.js'));
  app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  console.log('API module dependency compilation passed; no database connection or external provider was opened.');
} finally {
  if (app) await app.close();
  DataSource.prototype.initialize = initialize;
}
