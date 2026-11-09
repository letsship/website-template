# Website template

This repo is a website made of pages and section blocks, on SHIP Sites. It builds a static site from three inputs:

| Input | File | It holds |
| --- | --- | --- |
| Brand | `brand/brand.dna.json` | The name, the description, the colours, the fonts and the logo. |
| Structure | `site.config.ts` | The sections, the navigation, the footer and the optional files. |
| Words | `content/pages/` | The content, in MDX. |

The brand in this repo is a neutral starter called "Your Company". Change it to yours first.

## Start

You need Node.js 20.12 or later and pnpm.

```sh
pnpm install
pnpm dev
```

Edit `content/pages/index.mdx`, the home page. Each page is a list of blocks such as `Hero`, `FeatureGrid` and `Pricing`.

## Change the brand

The colours, the fonts and the name come from `brand/brand.dna.json`, never from CSS. After you change a colour, compute the derived values and check the brand:

```sh
pnpm exec dna derive brand/brand.dna.json --write
pnpm check
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the dev server. |
| `pnpm check` | Checks the config, the content and the brand. |
| `pnpm typecheck` | Checks the TypeScript. |
| `pnpm build` | Builds the site into `out/` and checks that every colour and font comes from the brand. |
| `pnpm test` | Runs the unit tests of the site's Worker in `public/_worker/`, when `ship.yml` names a `worker`. |
| `pnpm test:e2e` | Runs the smoke test against `out/`. Run `pnpm build` first. When `ship.yml` names a `worker`, it then runs the waitlist test, which needs Node.js 22.13 or later. |

The CI in `.github/workflows/ci.yml` runs all of them on each pull request. It needs no secrets.

## Add a waitlist

The `Waitlist` block is a sign-up form: an email field, a Turnstile check and a button. Put it on a page, and write each word of it in the site's language:

```mdx
<Waitlist
  title="Join the waitlist"
  label="Email address"
  button="Join"
  success="You are on the list."
  invalidEmail="Enter a valid email address."
  failed="The sign-up did not work. Try again."
/>
```

The form posts to `/api/waitlist`, which the site's own Worker in `public/_worker/` answers. The Worker checks the Turnstile token and stores the address in the site's database, in the table that `migrations/0001_create_waitlist.sql` makes. A repeat sign-up stores nothing new, and it gets the same answer as a new one.

The form works only where the site's Worker runs. `ship.yml` names it in `worker` on each SHIP-hosted entry, and SHIP runs it only for a site that SHIP made. In this template, `ship.yml` names no Worker, so the site stays static.

A page with the block needs the Turnstile site key at build, in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. A site that SHIP made holds its own key in `.env.production`. For a build on your machine, use Turnstile's test key:

```sh
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA pnpm build
```

A key that the build sets wins over the one in `.env.production`.

## Turn on another section

This repo can also hold a website, a blog or docs. Set the section in `site.config.ts` and add its content folder. For example, a blog at `/blog` takes its posts from `content/posts/`. The docs at https://letsship.ai/docs/sites/config list every key.

## Host it yourself

`pnpm build` writes a static site to `out/`, with the headers for each path in `out/_headers`. Upload `out/` to any static host that reads a `_headers` file, for example Cloudflare Workers static assets or Netlify. Only the waitlist needs server code: run `out/_worker/index.js` as the site's Worker, with the bindings `ASSETS`, `DB` and `TURNSTILE_SECRET_KEY`, and apply `migrations/` to its database.

## Work on it with SHIP

`AGENTS.md` and `.ship/agents/` hold the rules that SHIP's agents follow in this repo, and `ship.yml` tells SHIP how to build and test the site. Docs: https://letsship.ai/docs/sites.

## License

MIT
