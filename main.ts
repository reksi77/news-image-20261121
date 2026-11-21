// 21 November 2026 in One Image — entry copier.
//
// The image itself (entry.png, rendered from compose.html) sits beside this
// file. This program copies it to $MAKEFUN_OUTPUT_DIR/entry.png and verifies
// the copy: PNG signature, 1024x1024 dimensions, the 1 MiB size cap, and a
// sha256 match between source and copy. It reads no network and writes
// nothing else, so two runs produce byte-identical output.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir) {
  throw new Error("MAKEFUN_OUTPUT_DIR is not set");
}

const src = join(dirname(fileURLToPath(import.meta.url)), "entry.png");
const data = readFileSync(src);

// PNG signature: 137 80 78 71 13 10 26 10.
const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!data.subarray(0, 8).equals(pngSig)) {
  throw new Error("entry.png is not a PNG file");
}

// IHDR chunk: width at bytes 16-19, height at bytes 20-23 (big-endian).
// Bytes 12-15 must spell IHDR, so a truncated or mislabelled file is caught.
if (data.subarray(12, 16).toString("ascii") !== "IHDR") {
  throw new Error("entry.png has no IHDR chunk");
}
const width = data.readUInt32BE(16);
const height = data.readUInt32BE(20);
if (width > 1024 || height > 1024) {
  throw new Error(`image is ${width}x${height}, over the 1024x1024 cap`);
}
if (data.length > 1048576) {
  throw new Error(`entry.png is ${data.length} bytes, over the 1 MiB cap`);
}

const sha = createHash("sha256").update(data).digest("hex");
const dest = join(outDir, "entry.png");
writeFileSync(dest, data);

// Verify the copy byte for byte.
const back = readFileSync(dest);
if (createHash("sha256").update(back).digest("hex") !== sha) {
  throw new Error("copy verification failed: sha256 mismatch");
}
console.log(`copied entry.png (${data.length} bytes, ${width}x${height}, sha256 ${sha}) to ${dest}`);
