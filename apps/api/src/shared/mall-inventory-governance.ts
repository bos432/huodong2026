export type MallSkuInventoryState = { stock: number; lockedStock: number; expectedLockedStock?: number };
export type MallPromotionInventoryState = { capacity: number; lockedStock: number; soldStock: number };

export type MallInventoryIssue = {
  type: string;
  severity: "high" | "critical";
  title: string;
  message: string;
  expectedState: Record<string, number>;
  actualState: Record<string, number>;
};

const integer = (value: unknown) => Math.trunc(Number(value || 0));

export function mallInventoryStockSummary(rows: Array<{ stock: unknown; lockedStock: unknown }>) {
  return rows.reduce<{ stock: number; lockedStock: number; availableStock: number }>((summary, row) => {
    const stock = Math.max(integer(row.stock), 0);
    const lockedStock = Math.max(integer(row.lockedStock), 0);
    summary.stock += stock;
    summary.lockedStock += lockedStock;
    summary.availableStock += Math.max(stock - lockedStock, 0);
    return summary;
  }, { stock: 0, lockedStock: 0, availableStock: 0 });
}

export function detectMallSkuInventoryIssues(input: MallSkuInventoryState): MallInventoryIssue[] {
  const stock = integer(input.stock);
  const lockedStock = integer(input.lockedStock);
  const expectedLockedStock = input.expectedLockedStock === undefined ? undefined : Math.max(integer(input.expectedLockedStock), 0);
  const issues: MallInventoryIssue[] = [];
  if (stock < 0) issues.push({ type: "sku_negative_stock", severity: "critical", title: "SKU 总库存为负数", message: `当前总库存 ${stock}，违反库存非负约束。`, expectedState: { stock: 0 }, actualState: { stock, lockedStock } });
  if (lockedStock < 0) issues.push({ type: "sku_negative_locked", severity: "critical", title: "SKU 锁定库存为负数", message: `当前锁定库存 ${lockedStock}，违反锁定库存非负约束。`, expectedState: { lockedStock: 0 }, actualState: { stock, lockedStock } });
  if (lockedStock > stock) issues.push({ type: "sku_overlocked", severity: "critical", title: "SKU 锁定库存超过总库存", message: `总库存 ${stock}，锁定库存 ${lockedStock}，已存在超卖风险。`, expectedState: { stock: Math.max(lockedStock, 0), lockedStock: Math.max(lockedStock, 0) }, actualState: { stock, lockedStock } });
  if (expectedLockedStock !== undefined && lockedStock !== expectedLockedStock) issues.push({ type: "sku_pending_lock_mismatch", severity: "high", title: "SKU 锁定库存与待履约订单不一致", message: `库存记录锁定 ${lockedStock}，待支付/待确认订单应锁定 ${expectedLockedStock}。`, expectedState: { stock: Math.max(stock, expectedLockedStock), lockedStock: expectedLockedStock }, actualState: { stock, lockedStock } });
  return issues;
}

export function detectMallPromotionInventoryIssues(kind: "flash_sale" | "group_buy", input: MallPromotionInventoryState): MallInventoryIssue[] {
  const capacity = integer(input.capacity);
  const lockedStock = integer(input.lockedStock);
  const soldStock = integer(input.soldStock);
  const label = kind === "flash_sale" ? "秒杀" : "拼团";
  if (capacity >= 0 && lockedStock >= 0 && soldStock >= 0 && lockedStock + soldStock <= capacity) return [];
  return [{
    type: `${kind}_inventory_invalid`,
    severity: "critical",
    title: `${label}活动库存计数异常`,
    message: `${label}容量 ${capacity}，锁定 ${lockedStock}，已售 ${soldStock}，违反活动库存约束。`,
    expectedState: { capacity: Math.max(capacity, lockedStock, 0) < Math.max(lockedStock, 0) + Math.max(soldStock, 0) ? Math.max(lockedStock, 0) + Math.max(soldStock, 0) : Math.max(capacity, 0), lockedStock: Math.max(lockedStock, 0), soldStock: Math.max(soldStock, 0) },
    actualState: { capacity, lockedStock, soldStock }
  }];
}

export function repairMallSkuInventoryState(input: MallSkuInventoryState) {
  const expectedLockedStock = input.expectedLockedStock === undefined ? Math.max(integer(input.lockedStock), 0) : Math.max(integer(input.expectedLockedStock), 0);
  return { stock: Math.max(integer(input.stock), expectedLockedStock, 0), lockedStock: expectedLockedStock };
}

export function repairMallPromotionInventoryState(input: MallPromotionInventoryState) {
  const lockedStock = Math.max(integer(input.lockedStock), 0);
  const soldStock = Math.max(integer(input.soldStock), 0);
  return { capacity: Math.max(integer(input.capacity), lockedStock + soldStock, 0), lockedStock, soldStock };
}
