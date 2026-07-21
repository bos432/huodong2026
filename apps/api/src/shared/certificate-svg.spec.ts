import { describe, expect, it } from "vitest";
import { escapeCertificateSvg, renderCertificateSvg, renderCharityContributionSvg } from "./certificate-svg";

describe("certificate svg renderer", () => {
  const certificate = { id: 7, name: "慢π志愿证书", certificateNo: "MPCB-7", templateKey: "volunteer_service" as const, serviceHours: "80.80", threshold: 80, status: "active" as const, issuedAt: new Date("2026-07-21T00:00:00+08:00") };

  it("renders a complete downloadable certificate", () => {
    const result = renderCertificateSvg({ certificate, displayName: "测试志愿者" });
    expect(result.filename).toBe("慢π志愿证书.svg");
    expect(result.svg).toContain('width="1200" height="840"');
    expect(result.svg).toContain("测试志愿者");
    expect(result.svg).toContain("服务时长：80.8 小时");
    expect(result.svg).toContain("证书编号：MPCB-7");
  });

  it("escapes user-controlled text and marks revoked certificates", () => {
    const result = renderCertificateSvg({ certificate: { ...certificate, name: '<script>alert("x")</script>', status: "revoked" }, displayName: "甲&乙" });
    expect(result.svg).not.toContain("<script>");
    expect(result.svg).toContain("&lt;script&gt;");
    expect(result.svg).toContain("甲&amp;乙");
    expect(result.svg).toContain("已撤销");
  });

  it("escapes all XML-sensitive characters", () => {
    expect(escapeCertificateSvg(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&apos;");
  });

  it("renders an honest charity contribution record", () => {
    const result = renderCharityContributionSvg({ certificateNo: "MPCG20260721-000001-ABC12345", holderName: "李&明", contributionAmount: 3.25, sourceTitle: "公益活动", orderNo: "ORD-1", issuedAt: "2026-07-21T00:00:00+08:00", status: "active" });
    expect(result.svg).toContain("公益贡献 ¥3.25");
    expect(result.svg).toContain("非用户额外捐款或公益捐赠票据");
    expect(result.svg).toContain("李&amp;明");
    expect(result.svg).toContain("日期：2026/7/21");
    expect(result.svg).toContain("订单：ORD-1");
    expect(result.svg).toContain("凭证编号：MPCG20260721-000001-ABC12345");
  });

  it("marks reversed charity contributions", () => {
    const result = renderCharityContributionSvg({ certificateNo: "MPCG20260721-000001-ABC12345", holderName: "李明", contributionAmount: 0, sourceTitle: "公益活动", issuedAt: "2026-07-21T00:00:00+08:00", status: "reversed" });
    expect(result.svg).toContain("已冲正");
  });

  it("truncates long certificate fields before they can overlap", () => {
    const result = renderCharityContributionSvg({ certificateNo: `MPCG-${"A".repeat(80)}`, holderName: "超长公益参与者姓名用于布局验证", contributionAmount: 1, sourceTitle: "这是一个特别长的公益项目名称用于验证证书布局不会横向溢出或重叠", orderNo: `ORDER-${"9".repeat(60)}`, issuedAt: "2026-07-21T00:00:00+08:00", status: "adjusted" });
    expect(result.svg.match(/…/g)?.length).toBeGreaterThanOrEqual(3);
    expect(result.svg).not.toContain("9".repeat(60));
    expect(result.svg).not.toContain("A".repeat(80));
  });

  it("renders custom template colors, copy and safe assets", () => {
    const result = renderCertificateSvg({
      certificate,
      displayName: "测试用户",
      template: {
        title: "年度志愿荣誉证书", englishTitle: "ANNUAL SERVICE AWARD", description: "感谢持续参与", detailLabel: "累计服务",
        issuerName: "城市志愿中心", statement: "共同创造长期价值", primaryColor: "#123456", accentColor: "#654321",
        textColor: "#334455", backgroundColor: "#f0f1f2", borderColor: "#aabbcc", logoText: "志愿",
        logoUrl: "/uploads/logo.png", backgroundImageUrl: null, sealUrl: "https://example.com/seal.png", signatureUrl: null,
        numberPrefix: "CITY", publicHolderMode: "masked"
      }
    });
    expect(result.svg).toContain("年度志愿荣誉证书");
    expect(result.svg).toContain('stroke="#123456"');
    expect(result.svg).toContain('href="/uploads/logo.png"');
    expect(result.svg).toContain("城市志愿中心");
  });
});
