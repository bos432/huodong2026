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
  loadFeatureGates(true).then(() => guardCurrentPageFeature());
});
</script>

<style>
page {
  background: var(--page-bg, #F4F8F7);
  color: var(--text-color, #173F3A);
}
</style>
