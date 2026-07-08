<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { applyTenantBootstrapDefault } from "./api";
import { guardCurrentPageFeature, hydrateFeatureGatesFromStorage, loadFeatureGates } from "./feature-gates";
import { loadPageTheme } from "./theme";

onLaunch(() => {
  hydrateFeatureGatesFromStorage();
  applyTenantBootstrapDefault()
    .catch(() => null)
    .then(() => loadFeatureGates(true))
    .then(() => guardCurrentPageFeature());
  loadPageTheme();
});

onShow(() => {
  hydrateFeatureGatesFromStorage();
  loadFeatureGates().then(() => guardCurrentPageFeature());
});
</script>

<style>
page {
  background: var(--page-bg, #F5F0E8);
  color: var(--text-color, #333333);
}
</style>
