import { readFile } from "node:fs/promises";

const file = "apps/mobile/src/components/PageDecorationBlocks.vue";
const source = await readFile(file, "utf8");

const checks = [
  ["homepage decoration has no pseudo-orb", !source.includes(".decor-hero::after")],
  ["homepage decoration has no gradient background", !source.includes("linear-gradient") && !source.includes("radial-gradient")],
  ["activity focus keeps a solid readability mask", source.includes("background: rgba(8, 37, 34, 0.28)")]
];

for (const [label, passed] of checks) {
  if (!passed) throw new Error(`Mobile decoration style guard failed: ${label}`);
  console.log(`OK ${label}`);
}
