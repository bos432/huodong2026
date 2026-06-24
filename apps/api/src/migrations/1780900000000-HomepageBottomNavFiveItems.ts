import { MigrationInterface, QueryRunner } from "typeorm";

const fiveItemBottomNav = {
  items: [
    { label: "慢π", icon: "π", activeIcon: "π", link: "/pages/index/index", action: "mainPage", color: "#C43D3D" },
    { label: "课程", icon: "课", activeIcon: "课", link: "/pages/courses/index", action: "mainPage", color: "#C43D3D" },
    { label: "共修", icon: "修", activeIcon: "修", link: "/pages/community/index", action: "mainPage", color: "#C43D3D" },
    { label: "活动", icon: "活", activeIcon: "活", link: "/pages/activity/list", action: "mainPage", color: "#C43D3D" },
    { label: "我的", icon: "我", activeIcon: "我", link: "/pages/user/my", action: "mainPage", color: "#C43D3D" }
  ]
};

export class HomepageBottomNavFiveItems1780900000000 implements MigrationInterface {
  name = "HomepageBottomNavFiveItems1780900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("homepage_sections"))) return;
    const rows = await queryRunner.query("SELECT id, title, config, layout FROM homepage_sections WHERE type = 'bottom_nav'");
    for (const row of rows as Array<{ id: number; title: string | null; config: unknown; layout: unknown }>) {
      const config = this.parseJson(row.config);
      const items = Array.isArray(config.items) ? config.items : [];
      if (!this.isLegacyThreeItemNav(items)) continue;
      const layout = this.parseJson(row.layout);
      await queryRunner.query(
        "UPDATE homepage_sections SET title = ?, config = ?, layout = ? WHERE id = ?",
        [
          row.title === "底部菜单" || !row.title ? "前台底部导航" : row.title,
          JSON.stringify(fiveItemBottomNav),
          JSON.stringify({ ...layout, activeColor: layout.activeColor || "#C43D3D", textColor: layout.textColor || "#667085", backgroundColor: layout.backgroundColor || "#ffffff" }),
          row.id
        ]
      );
    }
  }

  public async down(): Promise<void> {
    // 保留运营侧当前导航配置，避免回滚代码时误删线上菜单。
  }

  private parseJson(value: unknown): Record<string, any> {
    if (!value) return {};
    if (typeof value === "object") return value as Record<string, any>;
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private isLegacyThreeItemNav(items: any[]) {
    if (items.length !== 3) return false;
    const links = items.map((item) => String(item?.link || "").trim());
    return links[0] === "/pages/index/index" && links[1] === "/pages/activity/list" && links[2] === "/pages/user/my";
  }
}
