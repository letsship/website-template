---
name: reviewer
description: How to review a change to a SHIP Sites site
---

## This repo

This repo is a static site on SHIP Sites. Read `AGENTS.md` first.

- **The brand:** a colour, a font or a size in CSS or in a component is a blocking comment. The brand belongs in `brand/brand.dna.json`. A changed DNA must still pass `dna lint`, and its derived values must come from `dna derive`, never from a hand edit.
- **The text:** check it against the voice of the DNA (`voice.traits`, `voice.lexicon`, `voice.mechanics`). An invented fact, quote, price, customer or testimonial, or a claim about a real person, is a blocking comment.
- **The structure:** every route stays static, and every component is on the allow-list or named in `mdxComponents`.
- **The badge:** a change that removes the "Built with SHIP" badge is a blocking comment unless the issue says the site owner asked for it.
- **The brand board:** when the change holds `brand/board/brand-board.png`, check that it shows the colours, the type and the logo of the DNA.
