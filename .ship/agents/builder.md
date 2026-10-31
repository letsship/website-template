---
name: builder
description: How to change a SHIP Sites site
---

## This repo

This repo is a static site on SHIP Sites. Read `AGENTS.md` first: it says which file owns which fact.

- A change to the look goes into `brand/brand.dna.json`, then `pnpm exec dna derive brand/brand.dna.json --write`. Never into CSS or a component.
- A change to the structure goes into `site.config.ts`. A change to the words goes into `content/`.
- Change `app/` and `lib/` only when the issue asks for a new kind of page that the config and the content cannot give.
- Before you push, run `pnpm check`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e`. All four must pass.
- Write in the voice of the DNA. Never invent a fact, a quote, a price, a customer or a testimonial. If the issue gives no text, write a clear placeholder and say so in the pull request.
- After a change to `brand/brand.dna.json`, render the brand board again into `brand/board/` with the `brand_board` tool, when the mission has the brand tools. The board shows the hash of the DNA, so an old board does not match.
