import { redirect } from "next/navigation";
import { fetchStaffCommissionsAction, getAuthUserAction } from "@/app/actions";
import CmsClient from "./CmsClient";

export const dynamic = 'force-dynamic';

export default async function CmsPage() {
  const user = await getAuthUserAction();
  if (!user || user.role === 'staff') {
    redirect('/nv');
  }

  const commissions = await fetchStaffCommissionsAction();
  return <CmsClient initialCommissions={commissions} initialUser={user} />;
}

