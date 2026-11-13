import { SIGNUP_LAYOUTS, signupView } from "@lets-ship/site/website/blocks/signup";
import { variantOf } from "@lets-ship/site/website/blocks/variant";
import type { ReactElement } from "react";
import { WaitlistForm, type WaitlistWords } from "./waitlist-form";

/** The build reads the site's public Turnstile key from this variable. The page shows it to every visitor. */
export const TURNSTILE_SITE_KEY_ENV = "NEXT_PUBLIC_TURNSTILE_SITE_KEY";

/** A page has the waitlist block, but the build has no Turnstile site key for it. */
export class TurnstileSiteKeyMissingError extends Error {
	constructor() {
		super(
			`A page uses the Waitlist block, but ${TURNSTILE_SITE_KEY_ENV} is not set, so its form cannot check visitors. ` +
				"A site that SHIP made holds its own key in .env.production. For any other build, set it to " +
				"Turnstile's test key: NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA pnpm build",
		);
		this.name = "TurnstileSiteKeyMissingError";
	}
}

/**
 * A sign-up form for the site's waitlist: an email field, a Turnstile check and a button. It posts
 * to the site's own Worker (`public/_worker/`), which checks the token and stores the address in
 * the site's database. Every word a visitor reads comes from the props, in the site's language.
 * The section is one of the engine's sign-up layouts, so it looks like the Newsletter block.
 */
export function Waitlist({
	id,
	tone,
	variant,
	title,
	intro,
	note,
	...words
}: WaitlistWords & {
	/** An anchor, so a link to "#waitlist" scrolls to the form. */
	readonly id?: string;
	/** The section tone, as on every block: base, tint, inverse or brand. */
	readonly tone?: string;
	/** The layout: panel (the words beside the form), start or centered. Without it: panel. */
	readonly variant?: string;
	readonly title?: string;
	readonly intro?: string;
	/** A line under the form, such as how often mail comes. */
	readonly note?: string;
}): ReactElement {
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
	if (!siteKey) throw new TurnstileSiteKeyMissingError();
	return signupView(variantOf("Waitlist", variant ?? "panel", SIGNUP_LAYOUTS), {
		name: "Waitlist",
		id,
		tone,
		// A page that names no title still needs a heading over its form: the button's words say what it is.
		title: title ?? words.button,
		text: intro,
		note,
		form: <WaitlistForm siteKey={siteKey} words={words} />,
	});
}
