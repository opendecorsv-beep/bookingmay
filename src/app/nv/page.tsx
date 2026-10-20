import { fetchStaffCommissionsAction, getAuthUserAction } from "@/app/actions";
import NvClient from "./NvClient";

export const dynamic = 'force-dynamic';

export default async function NvPage() {
  const [commissions, user] = await Promise.all([
    fetchStaffCommissionsAction(),
    getAuthUserAction(),
  ]);

  return <NvClient initialCommissions={commissions} initialUser={user} />;
}
