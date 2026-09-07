export const wuxingThemes = [
  { key: 'metal', glyph: '金', label: '手作', category: '手作时光', keyword: '手作' },
  { key: 'wood', glyph: '木', label: '漫游', category: '城市漫游', keyword: '漫游' },
  { key: 'water', glyph: '水', label: '共读', category: '阅读交流', keyword: '共读' },
  { key: 'fire', glyph: '火', label: '雅集', category: '文化体验', keyword: '雅集' },
  { key: 'earth', glyph: '土', label: '茶事', category: '文化体验', keyword: '茶' }
] as const;

export function wuxingActivityFilter(key: string, categories: Array<{ id: number; name?: string }>) {
  const theme = wuxingThemes.find(item => item.key === key);
  if (!theme) return { categoryId: undefined, keyword: '' };
  const category = categories.find(item => item.name === theme.category && Number.isSafeInteger(item.id) && item.id > 0);
  return { categoryId: category?.id, keyword: category && key !== 'earth' ? '' : theme.keyword };
}
