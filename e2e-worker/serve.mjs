// The site with its Worker, for the waitlist e2e test (playwright.worker.config.ts).
//
// 1. Copies this repo into .e2e-site/ and adds a page with the Waitlist block, and a
//    .env.production with another key, as the founder setup writes one (founder path F20).
// 2. Builds it with Turnstile's test site key, as SHIP builds a preview: that key must win.
// 3. Serves the build: every request goes to the built Worker (out/_worker/index.js), with the
//    built files as ASSETS, a SQLite database with migrations/ applied as DB, and a fake
//    siteverify in place of the network, as the hosting's outbound Worker would forward it.
//
//   node e2e-worker/serve.mjs --port 4174
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SITE = join(ROOT, ".e2e-site");
export const DATABASE_FILE = join(SITE, "waitlist.sqlite");
export const E2E_SECRET = "e2e-turnstile-secret";
const TEST_SITE_KEY = "1x00000000000000000000AA";
export const FILE_SITE_KEY = "0x4AAAAAAAkeyFromTheFile";
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** What git, a build or a test run keeps in the repo: never copied into the fixture. */
export const NOT_COPIED = new Set([
	".git",
	"node_modules",
	".next",
	"out",
	".source",
	".ship-site",
	".e2e-site",
	".turbo",
	"test-results",
	"playwright-report",
	"next-env.d.ts",
	"tsconfig.tsbuildinfo",
	// A lockfile in the copy would make ship-site take .e2e-site/ as the project root, and the
	// build could not reach this repo's node_modules outside it. Without one, the root is this repo.
	"pnpm-lock.yaml",
	"package-lock.json",
	"yarn.lock",
	"bun.lock",
	"bun.lockb",
]);

const WAITLIST_PAGE = `---
title: Join
description: A page for the waitlist test.
---

<Waitlist
  title="Join the waitlist"
  intro="This page exists only in the test build."
  label="Email address"
  button="Join"
  success="You are on the list."
  invalidEmail="Enter a valid email address."
  failed="The sign-up did not work. Try again."
/>
`;

function assemble() {
	rmSync(SITE, { recursive: true, force: true });
	mkdirSync(SITE);
	for (const entry of readdirSync(ROOT).filter((name) => !NOT_COPIED.has(name))) {
		cpSync(join(ROOT, entry), join(SITE, entry), { recursive: true });
	}
	// No node_modules in the copy: the build finds this repo's own one above .e2e-site/, as Node
	// resolves. A link there was scanned by Tailwind in a git repo (the `node_modules/` ignore rule
	// matches a folder, not a link) and put Next's own palette classes into the CSS.
	// The copy is a repository of its own, as the site is: inside this repo it is an ignored folder,
	// and Tailwind then scanned files the site's own .gitignore leaves out, so the site check
	// refused colours from outside the brand.
	execFileSync("git", ["init", "--quiet"], { cwd: SITE });
	writeFileSync(join(SITE, "content", "pages", "join.mdx"), WAITLIST_PAGE);
	writeFileSync(join(SITE, ".env.production"), `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${FILE_SITE_KEY}\n`);
}

function build() {
	const env = { ...process.env, NEXT_PUBLIC_TURNSTILE_SITE_KEY: TEST_SITE_KEY };
	execFileSync(join(ROOT, "node_modules", ".bin", "ship-site"), ["build"], { cwd: SITE, env, stdio: "inherit" });
}

/** The site's D1 database, as SQLite: the same SQL, through the calls the Worker makes. */
function database() {
	const sqlite = new DatabaseSync(DATABASE_FILE);
	const dir = join(SITE, "migrations");
	for (const file of readdirSync(dir)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		sqlite.exec(readFileSync(join(dir, file), "utf8"));
	}
	const statement = (sql, values) => ({
		run: async () => sqlite.prepare(sql).run(...values),
		first: async () => sqlite.prepare(sql).get(...values) ?? null,
		all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
	});
	return { prepare: (sql) => ({ ...statement(sql, []), bind: (...values) => statement(sql, values) }) };
}

/** A siteverify that knows the test tokens of e2e/: `e2e:<hostname>:<action>`. */
async function fakeSiteverify(url, init) {
	if (String(url) !== SITEVERIFY_URL || init?.method !== "POST") {
		return new Response("egress blocked", { status: 403 });
	}
	const form = new URLSearchParams(String(init.body));
	const match = /^e2e:([^:]+):([^:]*)$/.exec(form.get("response") ?? "");
	if (form.get("secret") !== E2E_SECRET || !match) {
		return Response.json({ success: false, "error-codes": ["invalid-input-response"] });
	}
	return Response.json({ success: true, hostname: match[1], action: match[2], "error-codes": [] });
}

const TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".svg": "image/svg+xml",
	".txt": "text/plain",
	".woff2": "font/woff2",
	".xml": "application/xml",
};

/** The file the hosting serves for a path: a folder's index.html, a file, or null. The Worker's folder is no file. */
function fileFor(out, pathname) {
	const file = normalize(join(out, pathname));
	if (pathname.startsWith("/_worker/") || !file.startsWith(out)) return null;
	if (pathname.endsWith("/")) return existsSync(join(file, "index.html")) ? join(file, "index.html") : null;
	return existsSync(file) && statSync(file).isFile() ? file : null;
}

/** The built files as ASSETS, with the site's 404 page for a path with no file. */
const assets = (out) => ({
	fetch: async (request) => {
		const file = fileFor(out, decodeURIComponent(new URL(request.url).pathname));
		const type = TYPES[extname(file ?? ".html")] ?? "application/octet-stream";
		const body = readFileSync(file ?? join(out, "404.html"));
		return new Response(body, { status: file ? 200 : 404, headers: { "content-type": type } });
	},
});

async function serve(port) {
	globalThis.fetch = fakeSiteverify;
	const out = join(SITE, "out");
	const worker = (await import(pathToFileURL(join(out, "_worker", "index.js")).href)).default;
	const env = { ASSETS: assets(out), DB: database(), TURNSTILE_SECRET_KEY: E2E_SECRET };
	createServer(async (req, res) => {
		const url = `http://${req.headers.host}${req.url}`;
		const hasBody = req.method !== "GET" && req.method !== "HEAD";
		const init = { method: req.method, headers: req.headers, body: hasBody ? Readable.toWeb(req) : undefined };
		const response = await worker.fetch(new Request(url, { ...init, duplex: "half" }), env);
		res.writeHead(response.status, Object.fromEntries(response.headers));
		res.end(Buffer.from(await response.arrayBuffer()));
	}).listen(port);
	process.stdout.write(`waitlist e2e: serving ${out} on port ${port}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({ options: { port: { type: "string" } } });
	assemble();
	build();
	await serve(Number(values.port));
}
