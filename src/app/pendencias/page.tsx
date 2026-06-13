import PendenciasClient from "./PendenciasClient";
import { ADMIN_ROLES, requirePageUser } from "@/lib/auth";

export const revalidate = 0;

export default async function PendenciasPage() {
  await requirePageUser(ADMIN_ROLES);
  return <PendenciasClient />;
}
