import { sitemapEntries } from "@lets-ship/site/site/outputs";
import type { MetadataRoute } from "next";
import { app } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	return sitemapEntries(app);
}
