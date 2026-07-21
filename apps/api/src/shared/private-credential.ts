import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { extname, join, resolve } from "path";
import { randomBytes } from "crypto";
import { decryptSecretBuffer, encryptSecretBuffer } from "./secret-storage";

const SCHEME = "secure-credential://";

function credentialRoot() {
  const root = resolve(process.cwd(), process.env.PRIVATE_CREDENTIAL_DIR || join("private-data", "payment-credentials"));
  mkdirSync(root, { recursive: true });
  return root;
}

export function storePrivateCredential(file: Express.Multer.File & { buffer: Buffer }) {
  const extension = extname(file.originalname || "").toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10) || ".bin";
  const id = `${Date.now()}-${randomBytes(12).toString("hex")}${extension}.enc`;
  writeFileSync(join(credentialRoot(), id), encryptSecretBuffer(file.buffer));
  return `${SCHEME}${id}`;
}

export function privateCredentialExists(value: string) {
  if (!value.startsWith(SCHEME)) return existsSync(value);
  const id = value.slice(SCHEME.length);
  return /^[a-zA-Z0-9._-]+$/.test(id) && existsSync(join(credentialRoot(), id));
}

export function readPrivateCredential(value: string) {
  if (!value.startsWith(SCHEME)) return readFileSync(value);
  const id = value.slice(SCHEME.length);
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error("Invalid secure credential reference");
  return decryptSecretBuffer(readFileSync(join(credentialRoot(), id)));
}
