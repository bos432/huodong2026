export function profileHeaderPalette(layout?: Record<string, unknown> | null) {
  const background = String(layout?.heroBackgroundColor || '').trim();
  const normalized = background.toLowerCase().replace(/\s/g, '');
  const legacyDefault = !normalized || ['#111827', '#16252d', '#386151', 'linear-gradient(135deg,#fff7ec0%,#f5ddc252%,#e8b89d100%)'].includes(normalized);
  if (legacyDefault) return { background: '#eff4ef', text: '#28332d', muted: '#65736a' };
  const hex = /^#([0-9a-f]{6})$/i.exec(background)?.[1];
  const light = hex ? (parseInt(hex.slice(0, 2), 16) * 299 + parseInt(hex.slice(2, 4), 16) * 587 + parseInt(hex.slice(4, 6), 16) * 114) / 1000 >= 160 : false;
  return {
    background,
    text: String(layout?.heroTextColor || (light ? '#28332d' : '#ffffff')),
    muted: String(layout?.heroMutedTextColor || (light ? '#65736a' : 'rgba(255, 255, 255, 0.68)'))
  };
}
