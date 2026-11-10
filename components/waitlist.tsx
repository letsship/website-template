import { Section } from "@lets-ship/site/website/blocks/parts";
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
 */
export function Waitlist({
	id,
	tone,
	title,
	intro,
	...words
}: WaitlistWords & {
	/** An anchor, so a link to "#waitlist" scrolls to the form. */
	readonly id?: string;
	/** The section tone, as on every block: base, tint, inverse or brand. */
	readonly tone?: string;
	readonly title?: string;
	readonly intro?: string;
}): ReactElement {
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
	if (!siteKey) throw new TurnstileSiteKeyMissingError();
	return (
		<Section name="Waitlist" id={id} tone={tone} title={title} intro={intro}>
			<WaitlistForm siteKey={siteKey} words={words} />
		</Section>
	);
}
