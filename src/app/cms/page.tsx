import { fetchStaffCommissionsAction, getAuthUserAction } from "@/app/actions";
import CmsClient from "./CmsClient";

export const dynamic = 'force-dynamic';

export default async function CmsPage() {
  const [commissions, user] = await Promise.all([
    fetchStaffCommissionsAction(),
    getAuthUserAction(),
  ]);

  return <CmsClient initialCommissions={commissions} initialUser={user} />;
}
