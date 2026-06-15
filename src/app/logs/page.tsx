import { ADMIN_ROLES, requirePageUser } from "@/lib/auth";
import LogsClient from "./LogsClient";

export const revalidate = 0;

export default async function LogsPage() {
  await requirePageUser(ADMIN_ROLES);
  return <LogsClient />;
}
