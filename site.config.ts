import { defineSiteConfig } from "@lets-ship/site/config";

/**
 * The structure of this site. Every key is required. The site's name, description, colours and
 * fonts are not here: they come from brand/brand.dna.json. Schema: https://letsship.ai/schema/site.json
 */
export const site = defineSiteConfig({
	origin: "https://your-company.sites.letsship.ai",
	titleSeparator: "|",
	sections: {
		website: { path: "/", content: "./content/pages" },
		blog: false,
		docs: false,
	},
	nav: [
		{ label: "Pricing", href: "/pricing" },
		{ label: "About", href: "/about" },
	],
	mdxComponents: [],
	footer: {
		columns: [
			{
				title: "Company",
				links: [
					{ label: "About", href: "/about" },
					{ label: "Pricing", href: "/pricing" },
				],
			},
		],
		social: "brand-links",
		badge: true,
	},
	features: { search: true, markdownCopies: true, llms: true },
	integrations: { analytics: { provider: "none" } },
});
