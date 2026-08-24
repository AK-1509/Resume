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

type RGB = [number, number, number];

/** Palette tokens, duplicated here because CSS is not importable from Node. */
const INK: RGB = [0x17, 0x17, 0x19];
const PAPER: RGB = [0xf2, 0xeb, 0xdd];
const CARD: RGB = [0xe3, 0xd9, 0xc7];
const CLARET: RGB = [0x72, 0x2f, 0x35];
const SAGE: RGB = [0x65, 0x75, 0x6a];

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

/**
 * A deterministic mock UI screenshot: title bar, sidebar, and a grid of
 * content blocks. Looks like the kind of thing that actually goes in a resume
 * gallery, so the duotone treatment and the card thumbnails can be judged
 * against something representative rather than against abstract noise.
 */
function png(seed: number): Buffer {
  // Cheap deterministic PRNG so a given seed always produces the same mock.
  let state = seed * 2654435761;
  const rand = () => ((state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const blocks: { x: number; y: number; w: number; h: number; fill: RGB }[] = [];

  // Header bar and sidebar chrome.
  blocks.push({ x: 0, y: 0, w: WIDTH, h: 64, fill: INK });
  blocks.push({ x: 0, y: 64, w: 210, h: HEIGHT - 64, fill: CARD });
  for (let i = 0; i < 7; i++) {
    blocks.push({ x: 32, y: 110 + i * 46, w: 120 + Math.floor(rand() * 40), h: 10, fill: SAGE });
  }

  // Main content: a headline rule, then a grid of panels with bar-chart fills.
  blocks.push({ x: 260, y: 110, w: 300, h: 18, fill: INK });
  blocks.push({ x: 260, y: 148, w: 460, h: 10, fill: SAGE });

  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const x = 260 + col * 310;
      const y = 210 + row * 280;
      blocks.push({ x, y, w: 280, h: 250, fill: CARD });
      const bars = 5;
      for (let b = 0; b < bars; b++) {
        const h = 40 + Math.floor(rand() * 150);
        blocks.push({
          x: x + 24 + b * 48,
          y: y + 250 - 24 - h,
          w: 32,
          h,
          fill: b % 3 === 0 ? CLARET : SAGE,
        });
      }
    }
  }

  const raw = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  let p = 0;
  for (let y = 0; y < HEIGHT; y++) {
    raw[p++] = 0; // filter type: none
    for (let x = 0; x < WIDTH; x++) {
      let colour: RGB = PAPER;
      for (const b of blocks) {
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) colour = b.fill;
      }
      raw[p++] = colour[0];
      raw[p++] = colour[1];
      raw[p++] = colour[2];
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
