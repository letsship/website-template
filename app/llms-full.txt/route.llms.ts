import { llmsFullBody } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
	return new Response(await llmsFullBody(app), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
