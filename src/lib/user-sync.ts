import { getAuthUser } from "@/lib/auth";

export async function getOrCreateDbUser() {
  return await getAuthUser();
}
