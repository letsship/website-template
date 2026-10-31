import { SiteRootLayout, siteMetadata } from "@lets-ship/site/layout/root";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { app } from "@/lib/site";
import "./global.css";

export const metadata: Metadata = siteMetadata(app.context);

export default function Layout({ children }: { readonly children: ReactNode }) {
	return <SiteRootLayout context={app.context}>{children}</SiteRootLayout>;
}
