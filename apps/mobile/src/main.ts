import { createSSRApp } from "vue";
import App from "./App.vue";
import { installH5ErrorReporting } from "./error-reporting";
import "./styles.css";

export function createApp() {
  const app = createSSRApp(App);
  installH5ErrorReporting(app);
  return { app };
}
