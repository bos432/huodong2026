import { createSSRApp } from "vue";
import App from "./App.vue";
import { installH5ErrorReporting } from "./error-reporting";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare } from "./share";
import "./styles.css";

export function createApp() {
  const app = createSSRApp(App);
  installH5ErrorReporting(app);
  app.mixin({
    onShareAppMessage() {
      return defaultMiniProgramShare();
    },
    onShareTimeline() {
      return defaultMiniProgramTimelineShare();
    }
  } as any);
  return { app };
}
