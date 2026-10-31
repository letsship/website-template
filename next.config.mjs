import { withShipSite } from "@lets-ship/site/next";
import { createMDX } from "fumadocs-mdx/next";

export default createMDX()(withShipSite({}));
