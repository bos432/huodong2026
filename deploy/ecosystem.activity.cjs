const appRoot = process.env.ACTIVITY_APP_ROOT || process.cwd();
const common = {
  cwd: appRoot,
  interpreter: "node",
  autorestart: true,
  watch: false,
  time: true,
  env: {
    NODE_ENV: process.env.NODE_ENV || "production",
    APP_VERSION: process.env.APP_VERSION || "0.1.0",
    BUILD_COMMIT: process.env.BUILD_COMMIT || "unknown",
    BUILD_TIME: process.env.BUILD_TIME || "unknown",
    BUSINESS_JOB_WORKER_MODE: "external",
    WORKER_HEARTBEAT_FILE: "runtime/activity-worker-heartbeat.json"
  }
};

module.exports = {
  apps: [
    {
      ...common,
      name: "activity-api",
      script: "apps/api/dist/main.js",
      env: {
        ...common.env,
        APP_PROCESS_ROLE: "api",
        BUSINESS_JOB_WORKER_ENABLED: "false"
      }
    },
    {
      ...common,
      name: "activity-worker",
      script: "apps/api/dist/worker.js",
      env: {
        ...common.env,
        APP_PROCESS_ROLE: "worker",
        BUSINESS_JOB_WORKER_ENABLED: "true",
        BUSINESS_JOB_WORKER_ID: process.env.BUSINESS_JOB_WORKER_ID || "worker-1"
      }
    }
  ]
};
