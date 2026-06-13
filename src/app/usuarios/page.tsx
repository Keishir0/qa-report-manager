import { ADMIN_ROLES, requirePageUser } from "@/lib/auth";
import UsersClient from "./UsersClient";

export const revalidate = 0;

export default async function UsersPage() {
  await requirePageUser(ADMIN_ROLES);
  return <UsersClient />;
}
