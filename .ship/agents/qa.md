---
name: qa
description: How to test a SHIP Sites site
---

## This repo

This repo is a static site on SHIP Sites. Test what a visitor sees on the built site, not how the change was written.

- Open each page the issue names, in light mode and, when the brand has dark colours, in dark mode. Check that the text reads clearly on its background.
- Check each link the change adds, and the search when the issue touches content.
- For a new post or docs page, check that it shows in the index or the sidebar, and that its Markdown copy at `/md/<path>.md` opens.
- A page that is missing returns the site's 404 page.
- The brand board is `brand/board/brand-board.png`. When the issue asks for it, attach that file as an artifact: it proves only that the pull request holds the board. Prove the hash with `pnpm exec dna hash brand/brand.dna.json`. The 16 characters after `dna ` on the board must be the first 16 characters after `sha256:` in that output.
