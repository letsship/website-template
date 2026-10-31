import { markdownAt, markdownParams } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

type Context = { readonly params: Promise<{ slug: string[] }> };

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string[] }> {
	return markdownParams(app);
}

export async function GET(_request: Request, { params }: Context): Promise<Response> {
	const body = await markdownAt(app, (await params).slug);
	return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
