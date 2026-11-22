/**
 * `npm run i18n:translate -- <locale>` — fills a catalog through DeepL's MCP server.
 *
 * It starts DeepL's own MCP server (`deepl-mcp-server`, published by DeepL
 * from github.com/DeepL/deepl-mcp-server) on stdio, speaks MCP to it, and
 * calls its `translate-text` tool with the strings the catalog is missing.
 * The answers are written to content/i18n/<locale>.json in page order.
 *
 *   npm run i18n:translate -- hi           translate what is missing
 *   npm run i18n:translate -- hi --all     translate every string again (drops `revised` notes)
 *   npm run i18n:translate -- hi --prune   also drop strings no longer on the page
 *   npm run i18n:translate -- hi --dry     print the result, write nothing
 *
 * The server needs DEEPL_API_KEY. A Free key ends in ":fx" and is sent to
 * api-free.deepl.com, a Pro key to api.deepl.com. In a cloud session whose
 * proxy injects the key, set it to a placeholder in the same shape, e.g.
 * `DEEPL_API_KEY=proxy-injected:fx`: the proxy replaces the header.
 *
 * DeepL is the first pass. Then run the `language-checker` skill, which reads
 * the catalog as a person would and rewrites what sounds machine-made,
 * recording each change in `revised`.
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { TRANSLATED_LOCALES, catalog, catalogPath, isLocale, type Locale } from "../../lib/i18n";
import type { Catalog } from "../../lib/schema";
import { pageStrings } from "./strings";

/** Pinned, so a new release of the server cannot change the output silently. */
const SERVER = "deepl-mcp-server@1.3.16";
/** DeepL takes up to 50 texts per request. */
const BATCH = 40;

/**
 * Not translated, only read by DeepL to choose words. It says what the
 * strings are and how they should sound; it names no one.
 */
const CONTEXT =
  "Short texts from a personal portfolio website: navigation and button labels, section headings, " +
  "project tags, and one-sentence summaries of product, health-tech and business-strategy projects. " +
  "Readers are recruiters and founders. Product, company and brand names stay as written.";

/** Asked for when the target language supports custom instructions; dropped if it does not. */
const INSTRUCTIONS = [
  "Write the way an educated professional would say it out loud: natural, warm and conversational, never stiff or bureaucratic.",
  "Prefer the everyday words people actually use, including established English loanwords, over rare formal coinages.",
  "Keep product, company and brand names, acronyms and numbers exactly as written.",
  "Keep labels short: a button or tag stays a few words.",
];

const [arg, ...flags] = process.argv.slice(2);
if (!arg || !isLocale(arg) || !TRANSLATED_LOCALES.includes(arg)) {
  console.error(`  Usage: npm run i18n:translate -- <locale> [--all] [--prune] [--dry]. Locales: ${TRANSLATED_LOCALES.join(", ")}.`);
  process.exit(1);
}
const locale: Locale = arg;
const all = flags.includes("--all");
const prune = flags.includes("--prune");
const dry = flags.includes("--dry");

if (!process.env.DEEPL_API_KEY) {
  console.error("  DEEPL_API_KEY is not set. Use a real key, or a placeholder such as proxy-injected:fx where a proxy injects it.");
  process.exit(1);
}

// --- A minimal MCP client over stdio --------------------------------------

type RpcResult = { content?: { type: string; text: string }[]; isError?: boolean; [k: string]: unknown };

const server = spawn("npx", ["-y", SERVER], { stdio: ["pipe", "pipe", "pipe"], env: process.env });
let serverLog = "";
server.stderr.on("data", (chunk) => (serverLog += chunk));

const pending = new Map<number, { resolve: (v: RpcResult) => void; reject: (e: Error) => void }>();
createInterface({ input: server.stdout }).on("line", (line) => {
  let msg: { id?: number; result?: RpcResult; error?: { message: string } };
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id)!;
  pending.delete(msg.id);
  if (msg.error) reject(new Error(msg.error.message));
  else resolve(msg.result ?? {});
});
server.on("exit", (code) => {
  for (const { reject } of pending.values()) reject(new Error(`the DeepL MCP server exited (${code}).\n${serverLog}`));
  pending.clear();
});

let nextId = 1;
function request(method: string, params: unknown): Promise<RpcResult> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
function notify(method: string, params: unknown = {}) {
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

async function translate(texts: string[], withInstructions: boolean): Promise<string[]> {
  const result = await request("tools/call", {
    name: "translate-text",
    arguments: {
      text: texts,
      sourceLangCode: "en",
      targetLangCode: locale,
      context: CONTEXT,
      ...(withInstructions ? { customInstructions: INSTRUCTIONS } : {}),
    },
  });
  const parts = (result.content ?? []).filter((c) => c.type === "text").map((c) => c.text);
  if (result.isError) throw new Error(parts.join("\n"));
  // One text per input, then two lines naming the languages used.
  if (parts.length < texts.length) throw new Error(`expected ${texts.length} translations, got ${parts.length}: ${parts.join(" | ")}`);
  return parts.slice(0, texts.length);
}

// --- Run ------------------------------------------------------------------

async function main() {
  const before: Catalog = catalog(locale);
  const sources = pageStrings();
  const todo = all ? sources : sources.filter((s) => !before.strings[s]);

  const init = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "portfolio-i18n", version: "1.0.0" },
  });
  notify("notifications/initialized");
  const info = (init.serverInfo ?? {}) as { name?: string; version?: string };
  console.log(`\n  Connected to ${info.name ?? "deepl"} ${info.version ?? ""} over MCP. ${todo.length} of ${sources.length} strings to translate into ${locale}.`);

  const translated: Record<string, string> = {};
  let withInstructions = true;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    let out: string[];
    try {
      out = await translate(batch, withInstructions);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!withInstructions || !/instruction/i.test(message)) throw err;
      console.log(`  DeepL does not take custom instructions for ${locale}; translating with context only.`);
      withInstructions = false;
      out = await translate(batch, false);
    }
    batch.forEach((source, j) => (translated[source] = out[j].trim()));
    console.log(`  ${Math.min(i + BATCH, todo.length)} / ${todo.length}`);
  }

  // Page order, so a diff of the catalog reads like the page.
  const strings: Record<string, string> = {};
  for (const source of sources) {
    const value = translated[source] ?? before.strings[source];
    if (value) strings[source] = value;
  }
  if (!prune) {
    for (const [source, value] of Object.entries(before.strings)) if (!(source in strings)) strings[source] = value;
  }
  // A string DeepL just translated again has lost the language check's rewrite.
  const revised = Object.fromEntries(
    Object.entries(before.revised ?? {}).filter(([source]) => source in strings && !(source in translated)),
  );

  const next: Catalog = {
    locale,
    translator: `DeepL, through DeepL's MCP server (${SERVER}, translate-text${withInstructions ? ", with custom instructions" : ""})`,
    strings,
    ...(Object.keys(revised).length ? { revised } : {}),
  };
  const json = JSON.stringify(next, null, 2) + "\n";
  if (dry) console.log(json);
  else writeFileSync(catalogPath(locale), json);
  console.log(`  ${dry ? "Would write" : "Wrote"} content/i18n/${locale}.json: ${Object.keys(translated).length} new, ${Object.keys(strings).length} in all.\n`);
}

main()
  .catch((err) => {
    console.error(`\n  Translation failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(() => server.kill());
