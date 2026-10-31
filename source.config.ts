import { readFileSync } from "node:fs";
import { docsFields, pageFields, postFields } from "@lets-ship/site/blog/frontmatter";
import { remarkAlerts } from "@lets-ship/site/mdx/remark-alerts";
import { z } from "@lets-ship/site/zod";
import { defineCollections, defineConfig, defineDocs } from "fumadocs-mdx/config";
import { site } from "./site.config";

/** The processed Markdown is each page's `.md` copy and its llms-full.txt entry. */
const markdownCopy = { includeProcessedMarkdown: true };

/**
 * A section's content folder, as site.config.ts names it; the content check reads the same one. A
 * section that is off still needs a collection for lib/site.ts to import, but nothing reads it.
 */
const folder = (section: { readonly content: string } | false, off: string): string =>
	section ? section.content : off;

const blog = site.sections.blog;
// With the blog off nothing reads the posts collection (lib/site.ts passes no posts), and the
// category enum still needs one member to exist; the config requires at least one category.
const [first = "posts", ...rest] = blog ? blog.categories.map((category) => category.slug) : [];

/** Website pages: read only when site.config.ts turns the website section on. */
export const pages = defineCollections({
	type: "doc",
	dir: folder(site.sections.website, "content/pages"),
	schema: z.object(pageFields),
	postprocess: markdownCopy,
});

/** Blog posts, each in a category site.config.ts lists. */
export const posts = defineCollections({
	type: "doc",
	dir: folder(blog, "content/posts"),
	schema: z.object(postFields([first, ...rest])),
	postprocess: markdownCopy,
});

/** Docs pages, with `meta.json` files for the sidebar. */
export const docs = defineDocs({
	dir: folder(site.sections.docs, "content/docs"),
	docs: { schema: z.object(docsFields), postprocess: markdownCopy },
});

// Written by `ship-site theme` from the brand DNA: code blocks in the brand's colours.
const shiki = JSON.parse(readFileSync(".ship-site/theme/shiki.json", "utf8"));

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [remarkAlerts],
		rehypeCodeOptions: {
			themes: { light: shiki.light, dark: shiki.dark },
			// Shiki's default stops a slow line after 500 ms, so its colours would depend on the machine.
			tokenizeTimeLimit: 0,
		},
	},
});
