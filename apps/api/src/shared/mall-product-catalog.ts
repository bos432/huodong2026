export function normalizeMallCatalogCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase().replace(/[^0-9A-Z_-]/g, "").slice(0, 80);
  return code || null;
}

export function normalizeMallCatalogAttributes(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => [String(key).trim().slice(0, 80), String(item ?? "").trim().slice(0, 300)] as const)
    .filter(([key]) => key)
    .slice(0, 100));
}

export function mallOrderProductSnapshot(product: any) {
  return {
    id: product.id, productCode: product.productCode || null, contentVersion: Number(product.contentVersion || 1), title: product.title,
    brand: product.brand ? { id: product.brand.id, code: product.brand.code, name: product.brand.name } : product.brandName ? { name: product.brandName } : null,
    platformCategory: product.platformCategory ? { id: product.platformCategory.id, code: product.platformCategory.code, name: product.platformCategory.name } : null,
    storeCategory: product.category ? { id: product.category.id, code: product.category.code, name: product.category.name } : null,
    coverUrl: product.coverUrl || null, galleryUrls: product.galleryUrls || [], attributes: product.attributes || {}, deliveryNote: product.deliveryNote || null, afterSaleNote: product.afterSaleNote || null
  };
}

export function mallOrderSkuSnapshot(sku: any, displayName: string, price: number) {
  return { id: sku.id, name: displayName, sourceName: sku.name, skuCode: sku.skuCode || null, barcode: sku.barcode || null, attributes: sku.attributes || {}, weightGrams: Number(sku.weightGrams || 0), price: price.toFixed(2), originalPrice: sku.originalPrice };
}
