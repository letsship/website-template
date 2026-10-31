import { searchIndexRoute } from "@lets-ship/site/search/route";
import { searchEntries } from "@lets-ship/site/site/outputs";
import { app } from "@/lib/site";

// The index is a file of the export: built once, downloaded on the first search.
export const revalidate = false;

export const GET = searchIndexRoute(searchEntries(app), app.context.identity.locale);
