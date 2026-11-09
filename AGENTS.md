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
| `pnpm test` | Runs the unit tests of the site Worker, on a site that has one. |
| `pnpm test:e2e` | Runs the smoke test against the built site. |

Every change must pass `pnpm check`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e`, and `pnpm test` on a site that has it. Never run `next build` alone: `pnpm build` runs it with the inputs it needs, and it stops on the first problem with the file and the fix.

## Rules

- **A brand change goes into the DNA, never into CSS or a component.** Edit `brand/brand.dna.json`, run `pnpm exec dna derive brand/brand.dna.json --write`, then `pnpm check`. Never edit a derived value (tonal steps, contrast pairs) by hand. The build refuses any colour or font that is not in the DNA.
- **A new logo or font file goes into `brand/assets/`, named by its SHA-256.** The DNA names it by that hash.
- **Every page stays static.** The pages are files: no API route in `app/`, no server action, no request-time data. Code that runs on a request goes only into the site Worker that `ship.yml` names in `worker`. SHIP runs that Worker only for a site that SHIP made.
- **The site Worker stays small.** It lives in `public/_worker/` as ES modules, and it imports only its own modules by a relative path, with no package. All of its modules together stay under 1 MiB. It has three bindings: `ASSETS`, `DB` and `TURNSTILE_SECRET_KEY`. It may call only Turnstile's siteverify, and SHIP refuses any other call.
- **A database change is a new file in `migrations/`,** named like `0002_add_name.sql`. Never edit a file that a deploy applied. Each deploy applies the new files first, and a file that fails stops the deploy.
- **Use only the components the site allows.** The section blocks are Hero, FeatureGrid, Steps, Pricing, Testimonials, LogoCloud, Stats, Faq, CallToAction, Team and Contact. Their props are at https://letsship.ai/docs/sites/blocks. A component of your own must be named in `mdxComponents` in `site.config.ts` and exported from `site.components.ts`.
- **Write in the voice of the DNA** (`voice.traits`, `voice.lexicon`, `voice.mechanics`). Never invent facts, quotes, prices, customers or testimonials, and never make a claim about a real person. A placeholder says it is a placeholder.
- **Never remove the "Built with SHIP" badge.** `footer.badge` is the site owner's choice, and only a plan that allows it can turn it off.
- **Never edit or commit generated folders:** `.ship-site/`, `public/_brand/`, `out/`, `.source/` and `.next/`.

## How to

- **Add a page:** a new MDX file in `content/pages/`. Its file name is its path, and `index.mdx` is the page at the section path.
- **Add a post:** a new MDX file in `content/posts/`, with `title`, `author`, `date` and `category` in the frontmatter. The author and the category must be in `site.config.ts`.
- **Add a docs page:** a new MDX file in `content/docs/`, and its name in the `pages` list of the folder's `meta.json`.
- **Add an author or a category:** an entry under `sections.blog` in `site.config.ts`.
- **Add a waitlist (website):** put the `Waitlist` block on a page, with the props `label`, `button`, `success`, `invalidEmail` and `failed` in the site's language, and an optional `title` and `intro`. The block needs `NEXT_PUBLIC_TURNSTILE_SITE_KEY` at build, and the form needs the site Worker that `ship.yml` names in `worker`. A site that SHIP made has both: its `.env.production` holds its own key. In any other build, set Turnstile's test key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA pnpm build`. A key the build sets wins over the file.
- **Turn on a section:** set `sections.website`, `sections.blog` or `sections.docs` to its object in `site.config.ts`, and add its content folder. Two sections cannot share a path, and one section must be at `/`.
