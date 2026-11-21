import { withShipSite } from "@lets-ship/site/next";
import { createMDX } from "fumadocs-mdx/next";

// Next 16.4 writes its own rules into AGENTS.md when an agent runs `next dev`. AGENTS.md is this
// repo's own, and SHIP's agents read it, so Next leaves it alone.
export default createMDX()(withShipSite({ agentRules: false }));
