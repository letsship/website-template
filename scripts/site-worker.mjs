// Runs the tests of the site Worker (public/_worker/) only on a site that runs it: one whose
// ship.yml names a `worker`. A static site has no Worker to test, so it pays for no second build
// and needs no newer Node.js.
//
//   node scripts/site-worker.mjs test        the Worker's unit tests (tests/)
//   node scripts/site-worker.mjs e2e         the waitlist e2e test (playwright.worker.config.ts)
//   ... --always                             run them whatever ship.yml names (SHIP's own CI)
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "usage: node scripts/site-worker.mjs test|e2e [--always]";

/** The e2e test serves the Worker on SQLite, which Node.js has without a flag from 22.13. */
const E2E_NODE = [22, 13];

/** True when a line of ship.yml sets `worker` (a comment does not). */
export function namesWorker(text) {
	return text.split("\n").some((line) => /^\s+worker\s*:\s*\S/.test(line));
}

/** True for a Node.js version (`v22.13.0`) at or after 22.13. */
export function nodeIsRecentEnough(version) {
	const [major = 0, minor = 0] = version.replace(/^v/, "").split(".").map(Number);
	return major > E2E_NODE[0] || (major === E2E_NODE[0] && minor >= E2E_NODE[1]);
}

const unitTests = () =>
	readdirSync(join(ROOT, "tests"))
		.filter((name) => name.endsWith(".test.mjs"))
		.sort()
		.map((name) => join("tests", name));

const MODES = {
	test: () => [process.execPath, ["--test", ...unitTests()]],
	e2e: () => {
		if (!nodeIsRecentEnough(process.version)) {
			throw new Error(`The site Worker's e2e test needs Node.js 22.13 or later; this is ${process.version}.`);
		}
		// The site's own Playwright, by its path: the script also runs outside a package script, with no .bin on PATH.
		const cli = createRequire(join(ROOT, "package.json")).resolve("@playwright/test/cli");
		return [process.execPath, [cli, "test", "-c", "playwright.worker.config.ts"]];
	},
};

function main(args) {
	const mode = MODES[args[0]];
	if (!mode || args.slice(1).some((arg) => arg !== "--always")) {
		process.stderr.write(`${USAGE}\n`);
		return 2;
	}
	if (!args.includes("--always") && !namesWorker(readFileSync(join(ROOT, "ship.yml"), "utf8"))) {
		process.stdout.write("site-worker: ship.yml names no worker, so this site has no Worker tests to run.\n");
		return 0;
	}
	const [command, commandArgs] = mode();
	const run = spawnSync(command, commandArgs, { cwd: ROOT, stdio: "inherit" });
	if (run.error) throw run.error;
	return run.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		process.exit(main(process.argv.slice(2)));
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exit(1);
	}
}
