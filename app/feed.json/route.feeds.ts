import { feedBody } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
	return new Response(feedBody(app, "json"), { headers: { "Content-Type": "application/feed+json; charset=utf-8" } });
}
