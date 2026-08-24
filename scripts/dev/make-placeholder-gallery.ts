/**
 * DEV ONLY — generates the placeholder PNGs that back the seed content in
 * `content/resume.json`. Real images arrive by being dropped into
 * `public/gallery/<experience-id>/` and referenced through the `resume-entry`
 * skill; nothing in the app calls this.
 *
 * Run with: npx tsx scripts/dev/make-placeholder-gallery.ts
 *
 * Writes a real PNG (not an SVG) so the gallery exercises the same code path
 * that user-supplied screenshots will.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { ResumeSchema } from "../../lib/schema";
import { readFileSync } from "node:fs";

const ROOT = resolve(import.meta.dirname, "..", "..");

const WIDTH = 1200;
const HEIGHT = 800;

/** Palette tokens, duplicated here because CSS is not importable from Node. */
const PALETTE: [number, number, number][] = [
  [0x17, 0x17, 0x19], // ink
  [0x72, 0x2f, 0x35], // claret
  [0x65, 0x75, 0x6a], // sage
  [0xb0, 0x8a, 0x4a], // brass
  [0xe3, 0xd9, 0xc7], // card
];

function crc32(buf: Buffer): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/** Deterministic diagonal-band placeholder, seeded off the filename. */
function png(seed: number): Buffer {
  const raw = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  let p = 0;
  for (let y = 0; y < HEIGHT; y++) {
    raw[p++] = 0; // filter type: none
    for (let x = 0; x < WIDTH; x++) {
      const band = Math.floor((x + y * 0.6) / 190 + seed) % PALETTE.length;
      const [r, g, b] = PALETTE[(band + PALETTE.length) % PALETTE.length];
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // 10..12 are compression, filter, interlace — all 0.

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const resume = ResumeSchema.parse(
  JSON.parse(readFileSync(join(ROOT, "content", "resume.json"), "utf8")),
);

let written = 0;
for (const exp of resume.experiences) {
  for (const [i, item] of exp.gallery.entries()) {
    const target = join(ROOT, "public", ...item.src.replace(/^\//, "").split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, png(i + exp.id.length));
    written++;
  }
}

console.log(`  wrote ${written} placeholder image${written === 1 ? "" : "s"}`);
