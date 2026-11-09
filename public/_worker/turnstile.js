// The Turnstile check of a sign-up: one siteverify call, then a check of its answer.
//
// The site's Turnstile widget accepts every host under the sites domain, so a page on another
// site can show this widget and get a valid token for it. A token is good only when siteverify
// says it was solved on this site's own host, for the action of the waitlist block.

/** Turnstile's server-side check. The site may call no other URL. */
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Cloudflare's documented test secret whose check always passes. A preview of the site gets it,
 * and a production site never does. siteverify accepts every token for it and answers with the
 * host "example.com" and no action, so its answer names no host or action to compare.
 */
export const TEST_SECRET_ALWAYS_PASSES = "1x0000000000000000000000000000000AA";

/**
 * @typedef {{ success?: unknown, hostname?: unknown, action?: unknown, metadata?: { result_with_testing_key?: unknown } }} SiteverifyAnswer
 * @typedef {{ ok: true, answer: SiteverifyAnswer } | { ok: false, detail: string }} SiteverifyResult
 * @typedef {(input: string, init: RequestInit) => Promise<Response>} Fetch
 */

/**
 * Asks siteverify about one token. The body is a form, and the URL has no query, because the
 * outbound Worker of the site forwards only that exact request.
 * @param {Fetch} fetchFn
 * @param {{ secret: string, token: string, remoteIp: string | null }} input
 * @returns {Promise<SiteverifyResult>}
 */
export async function siteverify(fetchFn, input) {
	const body = new URLSearchParams({ secret: input.secret, response: input.token });
	if (input.remoteIp) body.set("remoteip", input.remoteIp);
	let response;
	try {
		response = await fetchFn(SITEVERIFY_URL, { method: "POST", body });
	} catch (error) {
		return { ok: false, detail: `siteverify did not answer: ${error instanceof Error ? error.message : error}` };
	}
	if (!response.ok) return { ok: false, detail: `siteverify answered ${response.status}` };
	try {
		return { ok: true, answer: await response.json() };
	} catch {
		return { ok: false, detail: "siteverify answered with no JSON" };
	}
}

/** @param {string} secret @param {SiteverifyAnswer} answer */
function isTestAnswer(secret, answer) {
	return secret === TEST_SECRET_ALWAYS_PASSES && answer.metadata?.result_with_testing_key === true;
}

/**
 * Why the answer does not let this sign-up in, or null when it does. Pure.
 * @param {SiteverifyAnswer} answer
 * @param {{ secret: string, host: string, action: string }} expected
 * @returns {"not-success" | "hostname" | "action" | null}
 */
export function answerRefusal(answer, expected) {
	if (answer.success !== true) return "not-success";
	if (isTestAnswer(expected.secret, answer)) return null;
	const hostname = typeof answer.hostname === "string" ? answer.hostname.toLowerCase() : null;
	if (hostname !== expected.host.toLowerCase()) return "hostname";
	return answer.action === expected.action ? null : "action";
}
