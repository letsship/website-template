// The waitlist route of the site Worker, with a fake siteverify and a fake database.
// Run with `pnpm test`.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import worker from "../public/_worker/index.js";
import { SITEVERIFY_URL, TEST_SECRET_ALWAYS_PASSES } from "../public/_worker/turnstile.js";
import { BODY_MAX_BYTES, handleWaitlist, isWaitlistEmail } from "../public/_worker/waitlist.js";

const HOST = "acme.sites.example";
const SECRET = "site-secret";
const NOW = new Date("2026-11-03T10:00:00.000Z");

/** A database that keeps the rows of the waitlist table, unique by address without regard to case. */
function fakeDb() {
	const rows = [];
	const db = {
		rows,
		prepare: (sql) => ({
			bind: (...values) => ({
				run: async () => {
					assert.match(sql, /^INSERT OR IGNORE INTO waitlist /);
					const [email, source_path, created_at] = values;
					if (!rows.some((row) => row.email.toLowerCase() === email.toLowerCase())) {
						rows.push({ email, source_path, created_at });
					}
					return { success: true };
				},
			}),
		}),
	};
	return db;
}

/** A siteverify that answers as the real one would for a token solved on `hostname` for `action`. */
function fakeSiteverify(answer) {
	const calls = [];
	const fetch = async (url, init) => {
		calls.push({ url, init, form: new URLSearchParams(init.body) });
		return typeof answer === "function" ? answer() : Response.json(answer);
	};
	return { fetch, calls };
}

const goodAnswer = { success: true, hostname: HOST, action: "waitlist", "error-codes": [] };

function post(body, { host = HOST, type = "application/json", ip = "203.0.113.7" } = {}) {
	return new Request(`https://${host}/api/waitlist`, {
		method: "POST",
		headers: { "content-type": type, "cf-connecting-ip": ip },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

const signUp = (email = "ada@example.com") => ({ email, token: "token-1", source: "/" });

async function send(request, { answer = goodAnswer, secret = SECRET, db = fakeDb() } = {}) {
	const verify = fakeSiteverify(answer);
	const env = { DB: db, TURNSTILE_SECRET_KEY: secret };
	const response = await handleWaitlist(request, env, { fetch: verify.fetch, now: () => NOW });
	return { response, body: await response.json(), db, calls: verify.calls };
}

describe("the waitlist route", () => {
	it("stores a new address with its source page and time", async () => {
		const { response, body, db, calls } = await send(post({ ...signUp(), source: "/pricing/" }));
		assert.equal(response.status, 200);
		assert.deepEqual(body, { ok: true });
		assert.deepEqual(db.rows, [
			{ email: "ada@example.com", source_path: "/pricing/", created_at: "2026-11-03T10:00:00.000Z" },
		]);
		assert.equal(calls.length, 1);
		assert.equal(calls[0].url, SITEVERIFY_URL);
		assert.equal(calls[0].init.method, "POST");
		assert.deepEqual(Object.fromEntries(calls[0].form), {
			secret: SECRET,
			response: "token-1",
			remoteip: "203.0.113.7",
		});
	});

	it("answers a repeat sign-up exactly as a new one, and keeps one row", async () => {
		const db = fakeDb();
		const first = await send(post(signUp("ada@example.com")), { db });
		const second = await send(post(signUp("ADA@example.com")), { db });
		assert.equal(second.response.status, first.response.status);
		assert.deepEqual(second.body, first.body);
		assert.equal(db.rows.length, 1);
	});

	it("refuses a token that siteverify reports for another host", async () => {
		const { response, body, db } = await send(post(signUp()), {
			answer: { ...goodAnswer, hostname: "other.sites.example" },
		});
		assert.equal(response.status, 403);
		assert.deepEqual(body, { ok: false, error: "verification_failed" });
		assert.deepEqual(db.rows, []);
	});

	it("refuses a token that siteverify reports for another action", async () => {
		const { response, db } = await send(post(signUp()), { answer: { ...goodAnswer, action: "login" } });
		assert.equal(response.status, 403);
		assert.deepEqual(db.rows, []);
	});

	it("refuses a token whose answer names no action", async () => {
		const { action: _, ...noAction } = goodAnswer;
		const { response } = await send(post(signUp()), { answer: noAction });
		assert.equal(response.status, 403);
	});

	it("refuses a token that siteverify does not pass", async () => {
		const { response, db } = await send(post(signUp()), {
			answer: { success: false, "error-codes": ["invalid-input-response"] },
		});
		assert.equal(response.status, 403);
		assert.deepEqual(db.rows, []);
	});

	it("answers 502 and stores nothing when siteverify does not answer", async () => {
		const down = () => {
			throw new Error("connection refused");
		};
		const { response, body, db } = await send(post(signUp()), { answer: down });
		assert.equal(response.status, 502);
		assert.deepEqual(body, { ok: false, error: "verification_unavailable" });
		assert.deepEqual(db.rows, []);
	});

	it("answers 502 when siteverify answers with an error status", async () => {
		const { response } = await send(post(signUp()), { answer: () => new Response("busy", { status: 500 }) });
		assert.equal(response.status, 502);
	});

	it("passes the always-pass test secret's answer, which names example.com and no action", async () => {
		const testAnswer = {
			success: true,
			hostname: "example.com",
			"error-codes": [],
			metadata: { result_with_testing_key: true },
		};
		const { response, db } = await send(post(signUp()), { answer: testAnswer, secret: TEST_SECRET_ALWAYS_PASSES });
		assert.equal(response.status, 200);
		assert.equal(db.rows.length, 1);
	});

	it("refuses a testing-key answer when the bound secret is the site's own", async () => {
		const testAnswer = { success: true, hostname: "example.com", metadata: { result_with_testing_key: true } };
		const { response } = await send(post(signUp()), { answer: testAnswer, secret: SECRET });
		assert.equal(response.status, 403);
	});

	it("refuses an example.com answer with no testing flag under the test secret", async () => {
		const { response } = await send(post(signUp()), {
			answer: { success: true, hostname: "example.com" },
			secret: TEST_SECRET_ALWAYS_PASSES,
		});
		assert.equal(response.status, 403);
	});

	for (const email of ["", "ada", "ada@", "@example.com", "ada@example", "a da@example.com", "ada@exa_mple.com"]) {
		it(`refuses the address ${JSON.stringify(email)} before it calls siteverify`, async () => {
			const { response, body, calls } = await send(post(signUp(email)));
			assert.equal(response.status, 400);
			assert.deepEqual(body, { ok: false, error: "invalid_email" });
			assert.equal(calls.length, 0);
		});
	}

	it("refuses an address longer than 254 characters", async () => {
		const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`;
		assert.ok(email.length > 254);
		const { response } = await send(post(signUp(email)));
		assert.equal(response.status, 400);
	});

	it("trims the spaces around an address", async () => {
		const { db } = await send(post(signUp("  ada@example.com ")));
		assert.equal(db.rows[0].email, "ada@example.com");
	});

	it("refuses a sign-up with no token, before it calls siteverify", async () => {
		const { response, body, calls } = await send(post({ email: "ada@example.com", source: "/" }));
		assert.equal(response.status, 400);
		assert.deepEqual(body, { ok: false, error: "missing_token" });
		assert.equal(calls.length, 0);
	});

	it("refuses a source that is not a page path", async () => {
		const { response } = await send(post({ ...signUp(), source: "https://evil.example/" }));
		assert.equal(response.status, 400);
	});

	it("refuses a body that is not JSON", async () => {
		const { response, body } = await send(post("email=ada@example.com"));
		assert.equal(response.status, 400);
		assert.deepEqual(body, { ok: false, error: "invalid_body" });
	});

	it("refuses a form post, which a page on another site can send without asking", async () => {
		const { response } = await send(post("email=ada%40example.com", { type: "application/x-www-form-urlencoded" }));
		assert.equal(response.status, 415);
	});

	it("refuses a body larger than the limit, and reads no further", async () => {
		// Half the limit, then a chunk that passes it. A pull after that chunk fails the stream.
		const chunks = [new Uint8Array(BODY_MAX_BYTES / 2), new Uint8Array(BODY_MAX_BYTES)];
		let pulls = 0;
		const body = new ReadableStream(
			{
				pull(controller) {
					pulls += 1;
					const chunk = chunks.shift();
					if (!chunk) throw new Error("the route read past the chunk over the limit");
					controller.enqueue(chunk);
				},
			},
			{ highWaterMark: 0 },
		);
		const request = new Request(`https://${HOST}/api/waitlist`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body,
			duplex: "half",
		});
		const { response, calls } = await send(request);
		assert.equal(response.status, 413);
		assert.equal(pulls, 2);
		assert.equal(calls.length, 0);
	});

	it("answers 405 to any method but POST", async () => {
		const request = new Request(`https://${HOST}/api/waitlist`);
		const { response } = await send(request);
		assert.equal(response.status, 405);
		assert.equal(response.headers.get("allow"), "POST");
	});

	it("answers 500 and names no address when the database refuses the row", async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					run: async () => {
						throw new Error("D1_ERROR: no such table: waitlist");
					},
				}),
			}),
		};
		const originalError = console.error;
		const logged = [];
		console.error = (line) => logged.push(line);
		try {
			const { response, body } = await send(post(signUp()), { db });
			assert.equal(response.status, 500);
			assert.deepEqual(body, { ok: false, error: "storage_failed" });
		} finally {
			console.error = originalError;
		}
		assert.equal(logged.length, 1);
		assert.doesNotMatch(logged[0], /ada@example\.com/);
	});
});

describe("isWaitlistEmail", () => {
	it("takes common addresses", () => {
		for (const email of ["ada@example.com", "ada.lovelace+list@mail.example.co.uk", "o'neil@example.org"]) {
			assert.ok(isWaitlistEmail(email), email);
		}
	});
});

describe("the site Worker", () => {
	it("sends every path but the waitlist route to the site's files", async () => {
		const seen = [];
		const fetch = async (request) => {
			seen.push(request.url);
			return new Response("file");
		};
		const env = { ASSETS: { fetch } };
		const response = await worker.fetch(new Request(`https://${HOST}/pricing/`), env);
		assert.equal(await response.text(), "file");
		assert.deepEqual(seen, [`https://${HOST}/pricing/`]);
	});

	it("handles the waitlist route itself", async () => {
		const env = { ASSETS: { fetch: async () => assert.fail("the route went to the files") } };
		const response = await worker.fetch(new Request(`https://${HOST}/api/waitlist`), env);
		assert.equal(response.status, 405);
	});
});
