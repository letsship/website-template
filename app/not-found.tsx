import { SiteFrame } from "@lets-ship/site/layout/frame";
import { NotFoundView } from "@lets-ship/site/layout/not-found";
import { app } from "@/lib/site";

export default function NotFound() {
	return (
		<SiteFrame context={app.context}>
			<NotFoundView context={app.context} />
		</SiteFrame>
	);
}
