import { identityFromDna } from "@lets-ship/site/identity";
import { createSiteApp } from "@lets-ship/site/site/app";
import type { DocsSource, PageEntry, PostEntry } from "@lets-ship/site/site/sources";
import { urlPaths } from "@lets-ship/site/site/url-style";
import { loader } from "fumadocs-core/source";
import { docs, pages, posts } from "@/.source/server";
import dna from "../brand/brand.dna.json";
import { site } from "../site.config";

/** A content file's slug: its path below the content folder, without the extension; "" for an index. */
const slugOf = (path: string): string => path.replace(/\.mdx?$/, "").replace(/(^|\/)index$/, "");

function pageEntries(): PageEntry[] {
	return pages.map((page) => ({
		slug: slugOf(page.info.path),
		title: page.title,
		description: page.description,
		body: page.body,
		structuredData: page.structuredData,
		markdown: () => page.getText("processed"),
	}));
}

function postEntries(): PostEntry[] {
	return posts
		.filter((post) => !post.draft)
		.map((post) => ({
			...post,
			slug: slugOf(post.info.path),
			markdown: () => post.getText("processed"),
		}));
}

// A static export with trailing slashes (withShipSite), so every link carries one.
const style = { trailingSlash: true };

function docsSource(): DocsSource {
	const base = site.sections.docs ? site.sections.docs.path.replace(/\/$/, "") : "";
	// The sidebar links in the site's URL style, under the docs section's path.
	const url = (slugs: string[]): string => urlPaths(style).page(`${base}/${slugs.join("/")}`);
	const source = loader({ baseUrl: base || "/", url, source: docs.toFumadocsSource() });
	return {
		tree: source.pageTree,
		pages: source.getPages().map((page) => ({
			slugs: page.slugs,
			title: page.data.title,
			description: page.data.description,
			toc: page.data.toc,
			body: page.data.body,
			structuredData: page.data.structuredData,
			file: page.path,
			markdown: () => page.data.getText("processed"),
		})),
	};
}

/** The site's own MDX components, which site.config.ts names in `mdxComponents`. */
const components = {};

/** The whole site: its facts from the brand DNA, its structure from site.config.ts, its content. */
export const app = createSiteApp({
	config: site,
	identity: identityFromDna(dna),
	sources: {
		pages: site.sections.website ? pageEntries() : null,
		posts: site.sections.blog ? postEntries() : null,
		docs: site.sections.docs ? docsSource() : null,
	},
	components,
	style,
});
