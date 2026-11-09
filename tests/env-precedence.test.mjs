// Which Turnstile site key a build reads: the one in .env.production, unless the build sets its
// own. A site that SHIP made holds its key in that file, so its own CI builds the waitlist block,
// and a SHIP preview sets the test key, which must win. Each case runs the loader that
// `next build` runs, from the Next.js this site installs, in a fresh process as a build is.
// e2e-worker/ proves the same through a real build.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

const KEY = "NEXT_PUBLIC_TURNSTILE_SITE_KEY";
const NEXT_ENV = createRequire(createRequire(import.meta.url).resolve("next/package.json")).resolve("@next/env");

const LOAD = `
const { loadEnvConfig } = require(${JSON.stringify(NEXT_ENV)});
loadEnvConfig(process.argv[1], false, { info() {}, error() {} });
process.stdout.write(process.env.${KEY} ?? "(unset)");
`;

function siteWithEnvFile(value) {
	const dir = mkdtempSync(join(tmpdir(), "site-env-"));
	writeFileSync(join(dir, ".env.production"), `${KEY}=${value}\n`);
	return dir;
}

/** The value a production build in `dir` reads, with `buildValue` in its environment or none. */
function keyOfBuild(dir, buildValue) {
	const { [KEY]: _, ...env } = process.env;
	// `next build` runs as production: under NODE_ENV=test the loader would read .env.test instead.
	const production = { ...env, NODE_ENV: "production" };
	const withBuild = buildValue === undefined ? production : { ...production, [KEY]: buildValue };
	return execFileSync(process.execPath, ["-e", LOAD, dir], { env: withBuild, encoding: "utf8" });
}

describe("the site key of a build", () => {
	const dirs = [];
	afterEach(() => {
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	it("comes from .env.production when the build sets none", () => {
		const dir = siteWithEnvFile("0x4AAAAAAAsiteKey");
		dirs.push(dir);
		assert.equal(keyOfBuild(dir, undefined), "0x4AAAAAAAsiteKey");
	});

	it("is the build's own when the build sets one, as a SHIP preview does", () => {
		const dir = siteWithEnvFile("0x4AAAAAAAsiteKey");
		dirs.push(dir);
		assert.equal(keyOfBuild(dir, "1x00000000000000000000AA"), "1x00000000000000000000AA");
	});
});
