import { BRAND_URLS } from "@lets-ship/site/layout/brand-files";
import { SiteFooter } from "@lets-ship/site/layout/footer";
import { NotFoundView } from "@lets-ship/site/layout/not-found";
import { layoutOptions } from "@lets-ship/site/layout/root";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { app } from "@/lib/site";

export default function NotFound() {
	return (
		<HomeLayout {...layoutOptions(app.context, BRAND_URLS.mark)}>
			<NotFoundView context={app.context} />
			<SiteFooter context={app.context} />
		</HomeLayout>
	);
}
