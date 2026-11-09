// What the waitlist block and the site Worker agree on. The block imports this file too, so the
// two cannot drift: the route the form posts to, the Turnstile action it sets, and the limits.

/** The route of the site Worker that takes a sign-up. */
export const WAITLIST_PATH = "/api/waitlist";

/** The Turnstile action the block sets. The Worker refuses a token that siteverify reports for any other. */
export const WAITLIST_ACTION = "waitlist";

/** The longest address the route takes: the limit of a path in SMTP (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;

/** The longest page path the route records as the source of a sign-up. */
export const SOURCE_MAX_LENGTH = 512;
