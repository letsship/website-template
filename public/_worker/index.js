// The site's own Worker. The hosting serves every file of the site without it, so this runs only
// for a path with no file: the waitlist route, and every other path, which gets the site's 404 page.
//
// It has three bindings and no others: ASSETS (the site's files), DB (the site's own database)
// and TURNSTILE_SECRET_KEY. It may call only Turnstile's siteverify, and it may import only the
// other modules of this folder.

import { WAITLIST_PATH } from "./contract.js";
import { handleWaitlist } from "./waitlist.js";

export default {
	/** @param {Request} request @param {import("./waitlist.js").WaitlistEnv & { ASSETS: { fetch(request: Request): Promise<Response> } }} env */
	async fetch(request, env) {
		if (new URL(request.url).pathname !== WAITLIST_PATH) return env.ASSETS.fetch(request);
		// The runtime's fetch must be called on its own, never as a method of another object.
		return handleWaitlist(request, env, { fetch: (input, init) => fetch(input, init), now: () => new Date() });
	},
};
