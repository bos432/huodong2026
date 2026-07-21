import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { extname, join, resolve } from "path";
import { decryptSecretBuffer, encryptSecretBuffer } from "./secret-storage";

const LEGACY_SCHEME = "secure-aid-document://";
const SCHEME = "secure-private-document://";

function documentRoot(namespace = "aid-documents") {
  const configured = namespace === "aid-documents" ? process.env.PRIVATE_DOCUMENT_DIR : "";
  const privateDataRoot = process.env.PRIVATE_DATA_DIR || "private-data";
  const root = resolve(process.cwd(), configured || join(privateDataRoot, namespace));
  mkdirSync(root, { recursive: true });
  return root;
}

export function storePrivateDocument(file: Express.Multer.File & { buffer: Buffer }, namespace = "aid-documents") {
  const extension = extname(file.originalname || "").toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10) || ".bin";
  const id = `${Date.now()}-${randomBytes(12).toString("hex")}${extension}.enc`;
  const root = documentRoot(namespace);
  writeFileSync(join(root, id), encryptSecretBuffer(file.buffer));
  writeFileSync(join(root, `${id}.meta.json`), JSON.stringify({ version: 1, namespace, id, createdAt: new Date().toISOString(), claimedAt: null, originalName: String(file.originalname || "").slice(0, 180), mimetype: file.mimetype, size: file.buffer.length }));
  return namespace === "aid-documents" ? `${LEGACY_SCHEME}${id}` : `${SCHEME}${namespace}/${id}`;
}

export function claimPrivateDocument(reference: string) {
  const parsed = parseReference(reference);
  if (!parsed) return false;
  const path = join(documentRoot(parsed.namespace), `${parsed.id}.meta.json`);
  if (!existsSync(path)) return false;
  try {
    const metadata = JSON.parse(readFileSync(path, "utf8"));
    if (!metadata.claimedAt) writeFileSync(path, JSON.stringify({ ...metadata, claimedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function privateDocumentExists(reference: string) {
  const parsed = parseReference(reference);
  return Boolean(parsed && existsSync(join(documentRoot(parsed.namespace), parsed.id)));
}

export function readPrivateDocument(reference: string) {
  const parsed = parseReference(reference);
  if (!parsed) throw new Error("Invalid private document reference");
  return decryptSecretBuffer(readFileSync(join(documentRoot(parsed.namespace), parsed.id)));
}

export function removePrivateDocument(reference: string) {
  const parsed = parseReference(reference);
  if (!parsed) return false;
  const path = join(documentRoot(parsed.namespace), parsed.id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  const metadataPath = `${path}.meta.json`;
  if (existsSync(metadataPath)) unlinkSync(metadataPath);
  return true;
}

function parseReference(reference: string) {
  if (reference.startsWith(LEGACY_SCHEME)) {
    const id = reference.slice(LEGACY_SCHEME.length);
    return /^[a-zA-Z0-9._-]+$/.test(id) ? { namespace: "aid-documents", id } : null;
  }
  if (!reference.startsWith(SCHEME)) return null;
  const [namespace, id, ...extra] = reference.slice(SCHEME.length).split("/");
  if (extra.length || !/^[a-z0-9-]{1,60}$/.test(namespace) || !/^[a-zA-Z0-9._-]+$/.test(id)) return null;
  return { namespace, id };
}
