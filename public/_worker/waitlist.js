// The waitlist route: POST /api/waitlist with { email, token, source } as JSON.
//
// It checks the address, then the Turnstile token, then writes one row. A repeat sign-up
// answers exactly as a new one does, so the route never tells a visitor whether an address is
// already on the list.

import { EMAIL_MAX_LENGTH, SOURCE_MAX_LENGTH, WAITLIST_ACTION } from "./contract.js";
import { answerRefusal, siteverify } from "./turnstile.js";

/** The largest body the route reads. A Turnstile token is at most 2048 characters. */
export const BODY_MAX_BYTES = 8 * 1024;

const TOKEN_MAX_LENGTH = 2048;
// The local part takes the RFC 5322 atom characters and dots, the domain one or more labels.
const EMAIL_RE =
	/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
// A page path as the browser sends it: percent-encoded, so printable ASCII with no space.
const SOURCE_RE = /^\/[!-~]*$/;

const INSERT_SQL = "INSERT OR IGNORE INTO waitlist (email, source_path, created_at) VALUES (?, ?, ?)";

/**
 * @typedef {{ prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } } }} Database
 * @typedef {{ DB: Database, TURNSTILE_SECRET_KEY: string }} WaitlistEnv
 * @typedef {{ fetch: import("./turnstile.js").Fetch, now: () => Date }} WaitlistDeps
 * @typedef {{ email: string, token: string, source: string }} SignUp
 */

/** @param {number} status @param {Record<string, unknown>} body @param {Record<string, string>} [headers] */
function json(status, body, headers = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
	});
}

/** @param {number} status @param {string} error */
const refuse = (status, error) => json(status, { ok: false, error });

/** True for an address the route stores. Pure. @param {unknown} value @returns {value is string} */
export function isWaitlistEmail(value) {
	return typeof value === "string" && value.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(value);
}

/** @param {unknown} value @returns {value is string} */
const isSource = (value) => typeof value === "string" && value.length <= SOURCE_MAX_LENGTH && SOURCE_RE.test(value);

/** @param {unknown} value @returns {value is string} */
const isToken = (value) => typeof value === "string" && value.length > 0 && value.length <= TOKEN_MAX_LENGTH;

/**
 * The body as text, or null when it holds more than `max` bytes. It stops reading at the limit,
 * so a large body costs no more than the limit.
 * @param {Request} request @param {number} max @returns {Promise<string | null>}
 */
export async function readBodyText(request, max) {
	if (!request.body) return "";
	const reader = request.body.getReader();
	const chunks = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > max) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	return new Blob(chunks).text();
}

/**
 * The sign-up in a body, or the refusal of the body. Pure.
 * @param {string} text @returns {{ ok: true, signUp: SignUp } | { ok: false, status: number, error: string }}
 */
export function parseSignUp(text) {
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return { ok: false, status: 400, error: "invalid_body" };
	}
	if (typeof body !== "object" || body === null) return { ok: false, status: 400, error: "invalid_body" };
	const email = typeof body.email === "string" ? body.email.trim() : body.email;
	if (!isWaitlistEmail(email)) return { ok: false, status: 400, error: "invalid_email" };
	if (!isToken(body.token)) return { ok: false, status: 400, error: "missing_token" };
	if (!isSource(body.source)) return { ok: false, status: 400, error: "invalid_body" };
	return { ok: true, signUp: { email, token: body.token, source: body.source } };
}

/** The sign-up of a request, or the response that refuses it. @param {Request} request */
async function readSignUp(request) {
	const type = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
	if (type !== "application/json") return { ok: false, response: refuse(415, "unsupported_media_type") };
	const text = await readBodyText(request, BODY_MAX_BYTES);
	if (text === null) return { ok: false, response: refuse(413, "body_too_large") };
	const parsed = parseSignUp(text);
	return parsed.ok ? parsed : { ok: false, response: refuse(parsed.status, parsed.error) };
}

/**
 * The Turnstile check of one sign-up: null when it passes, else the response that refuses it.
 * @param {Request} request @param {WaitlistEnv} env @param {WaitlistDeps} deps @param {string} token
 */
async function verifyToken(request, env, deps, token) {
	const remoteIp = request.headers.get("cf-connecting-ip");
	const result = await siteverify(deps.fetch, { secret: env.TURNSTILE_SECRET_KEY, token, remoteIp });
	if (!result.ok) {
		console.error(`waitlist: the Turnstile check failed: ${result.detail}`);
		return refuse(502, "verification_unavailable");
	}
	const host = new URL(request.url).hostname;
	const refusal = answerRefusal(result.answer, { secret: env.TURNSTILE_SECRET_KEY, host, action: WAITLIST_ACTION });
	return refusal === null ? null : refuse(403, "verification_failed");
}

/**
 * Handles one request to the waitlist route.
 * @param {Request} request @param {WaitlistEnv} env @param {WaitlistDeps} deps @returns {Promise<Response>}
 */
export async function handleWaitlist(request, env, deps) {
	if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST" });
	const read = await readSignUp(request);
	if (!read.ok) return read.response;
	const { email, token, source } = read.signUp;
	const refused = await verifyToken(request, env, deps, token);
	if (refused) return refused;
	try {
		await env.DB.prepare(INSERT_SQL).bind(email, source, deps.now().toISOString()).run();
	} catch (error) {
		console.error(`waitlist: the sign-up was not stored: ${error instanceof Error ? error.message : error}`);
		return refuse(500, "storage_failed");
	}
	return json(200, { ok: true });
}
