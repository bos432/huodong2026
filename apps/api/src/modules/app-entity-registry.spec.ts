import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function entityClassNames() {
  const directory = join(__dirname, "..", "entities");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".entity.ts"))
    .flatMap((file) => [...readFileSync(join(directory, file), "utf8").matchAll(/export\s+class\s+([A-Za-z0-9_]+)/g)].map((match) => match[1]))
    .sort();
}

describe("application entity registry", () => {
  it("registers every entity in both runtime and migration data sources", () => {
    const appModule = readFileSync(join(__dirname, "app.module.ts"), "utf8").split("const entities =")[1] || "";
    const dataSource = readFileSync(join(__dirname, "..", "data-source.ts"), "utf8").split("entities: [")[1]?.split("migrations:")[0] || "";
    const classes = entityClassNames();

    expect(classes.filter((name) => !new RegExp(`\\b${name}\\b`).test(appModule))).toEqual([]);
    expect(classes.filter((name) => !new RegExp(`\\b${name}\\b`).test(dataSource))).toEqual([]);
  });
});
