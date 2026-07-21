import { describe, expect, it } from "vitest";
import { credentialTemplateKeys, defaultCredentialTemplate, normalizeCredentialTemplate } from "./credential-template";

describe("credential template configuration", () => {
  it("provides defaults for all five credential types", () => {
    expect(credentialTemplateKeys).toHaveLength(5);
    for (const key of credentialTemplateKeys) {
      const config = defaultCredentialTemplate(key);
      expect(config.title).toBeTruthy();
      expect(config.numberPrefix).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it("rejects unsafe assets and invalid colors", () => {
    const config = normalizeCredentialTemplate("volunteer_service", {
      primaryColor: "red",
      logoUrl: "javascript:alert(1)",
      sealUrl: "http://unsafe.example/seal.png",
      backgroundImageUrl: "/uploads/background.png"
    });
    expect(config.primaryColor).toBe(defaultCredentialTemplate("volunteer_service").primaryColor);
    expect(config.logoUrl).toBeNull();
    expect(config.sealUrl).toBeNull();
    expect(config.backgroundImageUrl).toBe("/uploads/background.png");
  });

  it("normalizes number prefixes, holder modes and bounded text", () => {
    const config = normalizeCredentialTemplate("city_builder", {
      numberPrefix: " city-2026 ",
      publicHolderMode: "full",
      title: "证".repeat(100)
    });
    expect(config.numberPrefix).toBe("CITY2026");
    expect(config.publicHolderMode).toBe("full");
    expect(Array.from(config.title)).toHaveLength(80);
  });
});
