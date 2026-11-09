import { rmSync } from "node:fs";
import { join } from "node:path";

/** Removes the test's copy of the site, so the next `pnpm build` hashes only the repo's own files. */
export default function teardown(): void {
	rmSync(join(import.meta.dirname, "..", ".e2e-site"), { recursive: true, force: true });
}
