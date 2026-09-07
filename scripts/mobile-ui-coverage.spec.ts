import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { wuxingActivityFilter, wuxingThemes } from '../apps/mobile/src/wuxing-navigation';
import { profileHeaderPalette } from '../apps/mobile/src/profile-header-palette';

describe('guofeng mobile journey', () => {
  const source = (file: string) => readFileSync(`apps/mobile/src/${file}`, 'utf8');
  it('includes the approved phrase and functional five-element navigation', () => {
    const home = source('pages/index/index.vue');
    expect(home).toContain('循五行，赴一场相聚');
    expect(home).toContain('@click="goWuxing(item.key)"');
    expect(home).toContain('@keyup.space.prevent="goWuxing(item.key)"');
    expect(wuxingThemes).toHaveLength(5);
    const categories = [{ id: 11, name: '手作时光' }, { id: 12, name: '城市漫游' }, { id: 13, name: '阅读交流' }, { id: 14, name: '文化体验' }];
    expect(wuxingActivityFilter('metal', categories)).toEqual({ categoryId: 11, keyword: '' });
    expect(wuxingActivityFilter('wood', categories)).toEqual({ categoryId: 12, keyword: '' });
    expect(wuxingActivityFilter('water', categories)).toEqual({ categoryId: 13, keyword: '' });
    expect(wuxingActivityFilter('earth', categories)).toEqual({ categoryId: 14, keyword: '茶' });
    expect(wuxingActivityFilter('fire', [])).toEqual({ categoryId: undefined, keyword: '雅集' });
    expect(wuxingActivityFilter('unknown', categories)).toEqual({ categoryId: undefined, keyword: '' });
  });
  it('keeps date groups, query filtering and pagination while sharing activity rows', () => {
    const list = source('pages/activity/list.vue');
    expect(list).toContain('<ActivityPreviewRow');
    expect(list).not.toContain('立即报名');
    expect(list).toContain('group in dateGroups');
    expect(list).toContain('onReachBottom(loadMore)');
    expect(list).toContain('keyword=${encodeURIComponent(keyword.value.trim())}');
    expect(list).toContain('categoryId=${activeCategoryId.value}');
  });
  it('uses a light default profile without forcing over merchant overrides', () => {
    expect(profileHeaderPalette().background).toBe('#eff4ef');
    expect(profileHeaderPalette({ heroBackgroundColor: '#111827' }).text).toBe('#28332d');
    expect(profileHeaderPalette({ heroBackgroundColor: 'linear-gradient(135deg, #FFF7EC 0%, #F5DDC2 52%, #E8B89D 100%)' }).background).toBe('#eff4ef');
    expect(profileHeaderPalette({ heroBackgroundColor: '#FFFFFF' }).text).toBe('#28332d');
    expect(profileHeaderPalette({ heroBackgroundColor: '#123456' }).text).toBe('#ffffff');
    expect(profileHeaderPalette({ heroBackgroundColor: '#123456', heroTextColor: '#eeeeee', heroMutedTextColor: '#cccccc' })).toEqual({ background: '#123456', text: '#eeeeee', muted: '#cccccc' });
    expect(source('pages/user/my.vue')).not.toContain('background: var(--app-primary) !important');
  });
  it('shares compact page headings on login and public help pages', () => {
    for (const file of ['pages/user/login.vue', 'pages/service/index.vue', 'pages/announcement/list.vue']) {
      expect(source(file)).toContain('<GuofengPageHeading');
      expect(source(file)).not.toContain('hero::after');
    }
    expect(source('pages/user/login.vue')).toContain('autocomplete="one-time-code"');
    expect(source('pages/activity/register.vue')).not.toContain('<view class="hero-mask">');
    expect(source('styles.css')).toContain(':root, page {');
  });
  it('loads the profile before protected member panels and keeps one shared five-item nav', () => {
    const my = source('pages/user/my.vue');
    expect(my.indexOf('const profileResult = await request<any>("/public/me/profile");')).toBeLessThan(my.indexOf('const results = await Promise.allSettled(['));
    const nav = source('components/AppBottomNav.vue');
    expect(nav).toContain('.slice(0, 5)');
    expect(nav).toContain('class="custom-tabbar"');
    expect(nav).toContain('grid-template-columns: repeat(var(--nav-columns), minmax(0, 1fr))');
  });
});
