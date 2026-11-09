import { defineConfig, devices } from "@playwright/test";

/**
 * The e2e test of the site Worker: the waitlist block on a built page, posting to the built
 * Worker. `e2e-worker/serve.mjs` builds its own copy of the site with a waitlist page, so it
 * needs no `pnpm build` first, and it takes a few minutes to start.
 */
const PORT = 4174;

export default defineConfig({
	testDir: "./e2e-worker",
	forbidOnly: !!process.env.CI,
	fullyParallel: false,
	workers: 1,
	reporter: process.env.CI ? "list" : "line",
	globalTeardown: "./e2e-worker/teardown.ts",
	use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `node e2e-worker/serve.mjs --port ${PORT}`,
		url: `http://localhost:${PORT}/join/`,
		reuseExistingServer: false,
		timeout: 300_000,
	},
});
