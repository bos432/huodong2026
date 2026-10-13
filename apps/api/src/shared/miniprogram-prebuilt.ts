import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export function verifyMiniprogramPrebuilt(root: string, expectedManifestHash: string) {
  if (!isAbsolute(root) || !/^[a-f0-9]{64}$/.test(expectedManifestHash)) throw new Error("Invalid prebuilt release configuration");
  const hash = (body: Buffer) => createHash("sha256").update(body).digest("hex");
  const manifestFile = join(root, "release-manifest.json");
  if (lstatSync(manifestFile).isSymbolicLink()) throw new Error("Release manifest must not be a symlink");
  const bytes = readFileSync(manifestFile);
  if (hash(bytes) !== expectedManifestHash) throw new Error("Release manifest checksum mismatch");
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (!manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) throw new Error("Invalid release file list");
  const actual: string[] = [];
  const visit = (relative: string) => {
    const dir = join(root, relative);
    if (lstatSync(dir).isSymbolicLink()) throw new Error("Release directory must not be a symlink");
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const name = relative ? `${relative}/${item.name}` : item.name;
      if (item.isSymbolicLink()) throw new Error("Release files must not be symlinks");
      if (item.isDirectory()) visit(name);
      else if (item.isFile() && name !== "release-manifest.json") actual.push(name);
      else if (!item.isFile()) throw new Error("Invalid release file type");
    }
  };
  visit("");
  if (JSON.stringify(actual.sort()) !== JSON.stringify(Object.keys(manifest.files).sort())) throw new Error("Release file list mismatch");
  for (const name of actual) if (hash(readFileSync(join(root, name))) !== manifest.files[name]) throw new Error(`Release checksum mismatch: ${name}`);
  for (const required of ["app.json", "project.config.json", "version.json"]) if (!actual.includes(required)) throw new Error(`Missing release file: ${required}`);
  const version = JSON.parse(readFileSync(join(root, "version.json"), "utf8"));
  if (version.name !== "mp-weixin" || !version.commit || !Number.isFinite(Date.parse(version.buildTime))) throw new Error("Invalid release version metadata");
  return { ...version, manifestSha256: expectedManifestHash };
}
