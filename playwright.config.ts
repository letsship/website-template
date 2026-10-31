import { defineConfig, devices } from "@playwright/test";

/**
 * The smoke test of the built site: run `pnpm build` first. It serves `out/` with the same rules
 * as the hosting, then opens the site in light and dark mode.
 */
const PORT = 4173;

export default defineConfig({
	testDir: "./e2e",
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? "list" : "line",
	use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
	projects: [
		{ name: "light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
		{ name: "dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
	],
	webServer: {
		command: `pnpm exec ship-site serve out --port ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
		timeout: 30_000,
	},
});
