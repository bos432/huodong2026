<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { applyTenantBootstrapDefault } from "./api";
import { loadPageTheme } from "./theme";

onLaunch(() => {
  applyTenantBootstrapDefault();
  loadPageTheme();
});
</script>

<style>
page {
  background: var(--page-bg, #F5F0E8);
  color: var(--text-color, #333333);
}
</style>
