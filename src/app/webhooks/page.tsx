import WebhookMonitor from "./WebhookMonitor";
import { ADMIN_ROLES, requirePageUser } from "@/lib/auth";

export const revalidate = 0;

export default async function WebhooksPage() {
  await requirePageUser(ADMIN_ROLES);
  return <WebhookMonitor />;
}
