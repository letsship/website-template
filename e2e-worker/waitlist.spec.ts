import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, type Page, test } from "@playwright/test";

const DATABASE_FILE = join(import.meta.dirname, "..", ".e2e-site", "waitlist.sqlite");
const TEST_SITE_KEY = "1x00000000000000000000AA";

/**
 * Turnstile's script, faked: the widget hands over a token at once, `e2e:<host>:<action>`, which
 * the test's siteverify reads as a token solved on that host for that action. The host is the
 * page's own, unless a test names another one.
 */
const FAKE_TURNSTILE = `
window.turnstile = {
	render(element, options) {
		element.setAttribute("data-e2e-sitekey", options.sitekey);
		const host = window.__e2eTurnstileHost || location.hostname;
		setTimeout(() => options.callback("e2e:" + host + ":" + options.action), 0);
		return "widget-1";
	},
	reset() {},
	remove() {},
};`;

test.beforeEach(async ({ context }) => {
	await context.route(/^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/, (route) =>
		route.fulfill({ contentType: "text/javascript", body: FAKE_TURNSTILE }),
	);
});

function rowsFor(email: string): Array<{ email: string; source_path: string; created_at: string }> {
	const db = new DatabaseSync(DATABASE_FILE, { readOnly: true });
	try {
		return db.prepare("SELECT email, source_path, created_at FROM waitlist WHERE email = ?").all(email) as Array<{
			email: string;
			source_path: string;
			created_at: string;
		}>;
	} finally {
		db.close();
	}
}

const waitlist = (page: Page) => page.locator('[data-block="Waitlist"]');

async function signUp(page: Page, email: string): Promise<void> {
	await page.goto("/join/");
	const form = waitlist(page).locator("form");
	await form.getByLabel("Email address").fill(email);
	const button = form.getByRole("button", { name: "Join" });
	await expect(button).toBeEnabled();
	await button.click();
}

test("a visitor joins the waitlist, and the site's database holds the address", async ({ page }) => {
	const email = `ada-${Date.now()}@example.com`;
	await signUp(page, email);

	await expect(waitlist(page).getByRole("status")).toHaveText("You are on the list.");
	const rows = rowsFor(email);
	expect(rows).toHaveLength(1);
	expect(rows[0]?.source_path).toBe("/join/");
	expect(Number.isNaN(Date.parse(rows[0]?.created_at ?? ""))).toBe(false);
});

test("the widget gets the build's own site key, not the one in .env.production", async ({ page }) => {
	await page.goto("/join/");
	await expect(page.locator("[data-e2e-sitekey]")).toHaveAttribute("data-e2e-sitekey", TEST_SITE_KEY);
	expect(await page.content()).not.toContain("0x4AAAAAAAkeyFromTheFile");
});

test("a repeat sign-up reads as a new one and keeps one row", async ({ page }) => {
	const email = `grace-${Date.now()}@example.com`;
	await signUp(page, email);
	await expect(waitlist(page).getByRole("status")).toBeVisible();
	await signUp(page, email);

	await expect(waitlist(page).getByRole("status")).toHaveText("You are on the list.");
	expect(rowsFor(email)).toHaveLength(1);
});

test("a token solved on another site's host is refused, and nothing is stored", async ({ page }) => {
	await page.addInitScript(() => {
		(window as unknown as { __e2eTurnstileHost: string }).__e2eTurnstileHost = "other-site.sites.example";
	});
	const email = `mallory-${Date.now()}@example.com`;
	await signUp(page, email);

	await expect(waitlist(page).getByRole("alert")).toHaveText("The sign-up did not work. Try again.");
	expect(rowsFor(email)).toEqual([]);
});

test("the route refuses a token for another action", async ({ request }) => {
	const response = await request.post("/api/waitlist", {
		data: { email: `eve-${Date.now()}@example.com`, token: "e2e:localhost:login", source: "/join/" },
	});
	expect(response.status()).toBe(403);
	expect(await response.json()).toEqual({ ok: false, error: "verification_failed" });
});
