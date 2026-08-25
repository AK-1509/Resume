/**
 * DEV ONLY — extracts the text layer from an exported PDF.
 *
 * Usage: npx tsx scripts/dev/pdf-text.ts .screenshots/resume-typical.pdf
 *
 * This is the check that matters for "ATS-parseable": a rasterised page would
 * return nothing here, and a page with broken font encoding would return
 * mojibake. Reading the output back and recognising the resume is the proof.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.argv[2] ?? ".screenshots/resume-typical.pdf");

async function main() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  console.log(`\n  ${file}`);
  console.log(`  pages: ${doc.numPages}\n`);

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    console.log(`  --- page ${i} (${text.length} chars) ---\n`);
    console.log(text.replace(/(.{100})/g, "$1\n"));
    console.log("");
  }
}

main();
