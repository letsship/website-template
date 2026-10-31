import { llmsBody } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
	return new Response(llmsBody(app), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
