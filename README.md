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
| `pnpm test:e2e` | Runs the smoke test against `out/`. Run `pnpm build` first. |

The CI in `.github/workflows/ci.yml` runs all of them on each pull request. It needs no secrets.

## Turn on another section

This repo can also hold a website, a blog or docs. Set the section in `site.config.ts` and add its content folder. For example, a blog at `/blog` takes its posts from `content/posts/`. The docs at https://letsship.ai/docs/sites/config list every key.

## Host it yourself

`pnpm build` writes a static site to `out/`, with the headers for each path in `out/_headers`. Upload `out/` to any static host that reads a `_headers` file, for example Cloudflare Workers static assets or Netlify. The site needs no server code.

## Work on it with SHIP

`AGENTS.md` and `.ship/agents/` hold the rules that SHIP's agents follow in this repo, and `ship.yml` tells SHIP how to build and test the site. Docs: https://letsship.ai/docs/sites.

## License

MIT
