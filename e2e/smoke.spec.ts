import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

/** Every page the build wrote, from its sitemap, as paths on this server. */
function pages(): string[] {
	const xml = readFileSync("out/sitemap.xml", "utf8");
	return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1] ?? "/").pathname);
}

// The layout has a search button for wide and for narrow screens; only one is visible.
const searchButton = (page: Page) =>
	page.locator("button[data-search-full], button[data-search]").filter({ visible: true }).first();

test("every page in the sitemap loads with a title and a visible heading", async ({ page }) => {
	const paths = pages();
	expect(paths).toContain("/");
	for (const path of paths) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(200);
		expect(await page.title(), path).not.toBe("");
		// A page whose content failed to render still has the header; its own heading would be gone.
		await expect(page.locator("h1, h2").filter({ visible: true }).first(), path).toBeVisible();
	}
});

test("search finds the home page by a word of its title", async ({ page }) => {
	await page.goto("/");
	test.skip((await searchButton(page).count()) === 0, "search is off in site.config.ts");
	const word = (await page.title()).split(/\s+/).find((part) => part.length > 3) ?? "";
	await searchButton(page).click();
	await page.getByRole("dialog").locator("input").fill(word);
	await expect(page.getByRole("dialog").getByRole("option").first()).toBeVisible();
});

test("a page that does not exist answers 404 with the site's page", async ({ page }) => {
	const response = await page.goto("/this-page-does-not-exist/");
	expect(response?.status()).toBe(404);
	await expect(page.locator('a[href="/"]').first()).toBeVisible();
});

test("follows the system's dark mode when the brand has dark colours", async ({ page }, info) => {
	await page.goto("/");
	const switchable = (await page.locator("[data-theme-toggle]").count()) > 0;
	const dark = info.project.name === "dark" && switchable;
	await expect(page.locator("html")).toHaveClass(dark ? /\bdark\b/ : /^(?!.*\bdark\b)/);
});
