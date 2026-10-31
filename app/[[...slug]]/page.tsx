import { staticParams } from "@lets-ship/site/site/app";
import { SitePage, siteMetadataAt } from "@lets-ship/site/site/site-page";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { app } from "@/lib/site";

type Props = { readonly params: Promise<{ slug?: string[] }> };

// Every path is known at build time: a path the content does not have is a 404.
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string[] }> {
	return staticParams(app);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	return siteMetadataAt(app, (await params).slug);
}

export default async function Page({ params }: Props): Promise<ReactElement> {
	return <SitePage app={app} slug={(await params).slug} />;
}
