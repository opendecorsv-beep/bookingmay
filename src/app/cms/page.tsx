import { redirect } from "next/navigation";
import { fetchStaffCommissionsAction, getAuthUserAction } from "@/app/actions";
import CmsClient from "./CmsClient";

export const dynamic = 'force-dynamic';

export default async function CmsPage() {
  const user = await getAuthUserAction();
  if (!user) {
    redirect('/');
  }
  if (user.role === 'staff') {
    redirect('/nv/chat');
  }
  if (user.role === 'receptionist') {
    redirect('/');
  }

  const commissions = await fetchStaffCommissionsAction();
  return <CmsClient initialCommissions={commissions} initialUser={user} />;
}

