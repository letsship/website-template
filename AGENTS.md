# Rules for this site

This repo is a static site on SHIP Sites. The site engine, `@lets-ship/site`, builds a website, a blog and docs from three inputs, and every value a reader sees comes from one of them.

| Input | File | It owns |
|---|---|---|
| Brand | `brand/brand.dna.json` | The name, the description, the links, the colours, the fonts, the logos and the voice. |
| Structure | `site.config.ts` | The sections and their paths, the navigation, the footer and the optional files. |
| Words | `content/` | The pages (`content/pages/`), the posts (`content/posts/`) and the docs (`content/docs/`), in MDX. |

Docs: https://letsship.ai/docs/sites. Config schema: https://letsship.ai/schema/site.json.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Compiles the brand and starts the dev server. |
| `pnpm check` | Checks the config, the content and the brand. |
| `pnpm typecheck` | Checks the TypeScript. |
| `pnpm build` | Builds the site into `out/` and checks the output. |
| `pnpm test:e2e` | Runs the smoke test against the built site. |

Every change must pass `pnpm check`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e`. Never run `next build` alone: `pnpm build` runs it with the inputs it needs, and it stops on the first problem with the file and the fix.

## Rules

- **A brand change goes into the DNA, never into CSS or a component.** Edit `brand/brand.dna.json`, run `pnpm exec dna derive brand/brand.dna.json --write`, then `pnpm check`. Never edit a derived value (tonal steps, contrast pairs) by hand. The build refuses any colour or font that is not in the DNA.
- **A new logo or font file goes into `brand/assets/`, named by its SHA-256.** The DNA names it by that hash.
- **Every route stays static.** SHIP Sites serves only files: no API route that runs code, no server action, no request-time data.
- **Use only the components the site allows.** The section blocks are Hero, FeatureGrid, Steps, Pricing, Testimonials, LogoCloud, Stats, Faq, CallToAction, Team and Contact. Their props are at https://letsship.ai/docs/sites/blocks. A component of your own must be named in `mdxComponents` in `site.config.ts`.
- **Write in the voice of the DNA** (`voice.traits`, `voice.lexicon`, `voice.mechanics`). Never invent facts, quotes, prices, customers or testimonials, and never make a claim about a real person. A placeholder says it is a placeholder.
- **Never remove the "Built with SHIP" badge.** `footer.badge` is the site owner's choice, and only a plan that allows it can turn it off.
- **Never edit or commit generated folders:** `.ship-site/`, `public/_brand/`, `out/`, `.source/` and `.next/`.

## How to

- **Add a page:** a new MDX file in `content/pages/`. Its file name is its path, and `index.mdx` is the page at the section path.
- **Add a post:** a new MDX file in `content/posts/`, with `title`, `author`, `date` and `category` in the frontmatter. The author and the category must be in `site.config.ts`.
- **Add a docs page:** a new MDX file in `content/docs/`, and its name in the `pages` list of the folder's `meta.json`.
- **Add an author or a category:** an entry under `sections.blog` in `site.config.ts`.
- **Turn on a section:** set `sections.website`, `sections.blog` or `sections.docs` to its object in `site.config.ts`, and add its content folder. Two sections cannot share a path, and one section must be at `/`.
