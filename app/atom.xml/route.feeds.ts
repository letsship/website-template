import { feedBody } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
	return new Response(feedBody(app, "atom"), { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
}
