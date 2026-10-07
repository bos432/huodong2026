import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("community core accessibility contract", () => {
  it("keeps check-in and learning plan controls keyboard reachable", () => {
    const checkin = readFileSync(resolve(process.cwd(), "../mobile/src/pages/community/checkin.vue"), "utf8");
    const program = readFileSync(resolve(process.cwd(), "../mobile/src/pages/community/program.vue"), "utf8");
    expect(checkin).toContain('@keyup.space.prevent="goBack"');
    expect(checkin).toContain('@keyup.space.prevent="loadCheckin"');
    expect(checkin).toContain('@keyup.space.prevent="doCheckin"');
    expect(program).toContain('@keyup.space.prevent="goBack"');
    expect(program).toContain('@keyup.space.prevent="load"');
    expect(program).toContain('@keyup.space.prevent="joinProgram"');
    expect(program).toContain('@keyup.space.prevent="submitCheckin(task)"');
  });
});
