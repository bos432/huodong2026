export function normalizeRefundPagination(pageInput?: number, pageSizeInput?: number) {
  const page = Math.max(Number(pageInput || 1), 1);
  const pageSize = Math.min(Math.max(Number(pageSizeInput || 20), 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}
