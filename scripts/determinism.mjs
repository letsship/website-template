// Builds the site twice and fails unless both builds give the same output hash (SHIP Sites D36):
// hosting skips an upload whose hash matches the live one, so a build that drifts would redeploy
// for nothing, and a reviewer could not trust a hash to name the bytes.
//
// The first build starts from nothing, as a fresh runner does. The second keeps what tools
// generate between builds (fumadocs-mdx's .source), as a second build in one checkout does, so a
// generated file that leaks into the hash fails here.
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = createRequire(join(root, "package.json"))
	.resolve("@lets-ship/site/package.json")
	.replace(/package\.json$/, "dist/node/bin.js");

const OUTPUTS = [".next", "out", ".ship-site", "public/_brand"];

function build(remove) {
	for (const dir of remove) rmSync(join(root, dir), { recursive: true, force: true });
	execFileSync(process.execPath, [bin, "build"], { cwd: root, stdio: "inherit" });
	return JSON.parse(readFileSync(join(root, "out", ".ship-site.json"), "utf8"));
}

const first = build([...OUTPUTS, ".source"]);
const second = build(OUTPUTS);
const same = first.output === second.output && first.buildId === second.buildId;
if (!same) {
	process.stderr.write(
		`determinism: the two builds differ\n  first:  ${first.buildId} ${first.output}\n  second: ${second.buildId} ${second.output}\n`,
	);
	process.exit(1);
}
process.stdout.write(`determinism: both builds hash to ${first.output} (build id ${first.buildId})\n`);
