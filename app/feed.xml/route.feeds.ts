import { feedBody } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
	return new Response(feedBody(app, "rss"), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
