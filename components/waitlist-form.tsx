"use client";

import { SignupDone, SignupFields } from "@lets-ship/site/website/blocks/signup";
import { type FormEvent, type ReactElement, useEffect, useId, useRef, useState } from "react";
import { EMAIL_MAX_LENGTH, WAITLIST_ACTION, WAITLIST_PATH } from "@/public/_worker/contract.js";

/** The words of the form, each one from the page's MDX. */
export type WaitlistWords = {
	/** The label of the email field. */
	readonly label: string;
	readonly button: string;
	/** What the visitor reads after a sign-up. */
	readonly success: string;
	/** What the visitor reads when the address is not a valid one. */
	readonly invalidEmail: string;
	/** What the visitor reads when the check or the sign-up fails. */
	readonly failed: string;
};

type Turnstile = {
	render(element: HTMLElement, options: Record<string, unknown>): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
};

declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

type Status = "ready" | "sending" | "done" | "invalid" | "failed";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<Turnstile> | null = null;

/** Loads Turnstile's script once for the page, however many forms it has. */
function loadTurnstile(): Promise<Turnstile> {
	loading ??= new Promise<Turnstile>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = SCRIPT_URL;
		script.async = true;
		script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
		script.onerror = () => reject(new Error("Turnstile did not load"));
		document.head.append(script);
	}).catch((error: unknown) => {
		loading = null;
		throw error;
	});
	return loading;
}

/** Renders the Turnstile widget into `slot` and reports each token, or null when one expires. */
function useTurnstile(siteKey: string, onToken: (token: string | null) => void, onError: () => void) {
	const slot = useRef<HTMLDivElement>(null);
	const widget = useRef<string | null>(null);
	useEffect(() => {
		let removed = false;
		loadTurnstile()
			.then((turnstile) => {
				if (removed || !slot.current) return;
				widget.current = turnstile.render(slot.current, {
					sitekey: siteKey,
					action: WAITLIST_ACTION,
					// The widget shows itself only when it must ask the visitor something.
					appearance: "interaction-only",
					callback: (token: string) => onToken(token),
					"expired-callback": () => onToken(null),
					"error-callback": onError,
				});
			})
			.catch(onError);
		return () => {
			removed = true;
			if (widget.current) window.turnstile?.remove(widget.current);
		};
	}, [siteKey, onToken, onError]);
	const reset = () => {
		if (widget.current) window.turnstile?.reset(widget.current);
	};
	return { slot, reset };
}

async function postSignUp(email: string, token: string): Promise<Status> {
	try {
		const response = await fetch(WAITLIST_PATH, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, token, source: window.location.pathname }),
		});
		if (response.ok) return "done";
		const body: { error?: unknown } = await response.json().catch(() => ({}));
		return body.error === "invalid_email" ? "invalid" : "failed";
	} catch {
		return "failed";
	}
}

export function WaitlistForm({
	siteKey,
	words,
}: {
	readonly siteKey: string;
	readonly words: WaitlistWords;
}): ReactElement {
	const id = useId();
	const [status, setStatus] = useState<Status>("ready");
	const token = useRef<string | null>(null);
	// The address of a visitor who pressed the button before the check gave its token.
	const waiting = useRef<string | null>(null);
	const reset = useRef<(() => void) | null>(null);

	const [send] = useState(() => async (email: string, checked: string) => {
		setStatus("sending");
		const next = await postSignUp(email, checked);
		setStatus(next);
		// A token is good for one check, so a refused sign-up needs a new one.
		if (next !== "done") {
			token.current = null;
			reset.current?.();
		}
	});
	const [onToken] = useState(() => (next: string | null) => {
		token.current = next;
		const email = waiting.current;
		if (next === null || email === null) return;
		waiting.current = null;
		void send(email, next);
	});
	const [onError] = useState(() => () => {
		waiting.current = null;
		setStatus("failed");
	});
	const turnstile = useTurnstile(siteKey, onToken, onError);
	reset.current = turnstile.reset;

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const email = String(new FormData(event.currentTarget).get("email") ?? "");
		if (token.current) {
			void send(email, token.current);
			return;
		}
		// The check is still at work: the form waits for its token, then sends.
		waiting.current = email;
		setStatus("sending");
	};

	if (status === "done") {
		return (
			<div data-waitlist-state="done">
				<SignupDone text={words.success} />
			</div>
		);
	}
	const message = status === "invalid" ? words.invalidEmail : status === "failed" ? words.failed : undefined;
	return (
		<form className="site-form" onSubmit={submit} data-waitlist-state={status} noValidate>
			<SignupFields
				id={`${id}-email`}
				label={words.label}
				button={words.button}
				maxLength={EMAIL_MAX_LENGTH}
				busy={status === "sending"}
				message={message}
			>
				<div ref={turnstile.slot} className="site-signup-check" />
			</SignupFields>
		</form>
	);
}
