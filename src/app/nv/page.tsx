import { redirect } from "next/navigation";
import { fetchStaffCommissionsAction, getAuthUserAction } from "@/app/actions";
import NvClient from "./NvClient";

export const dynamic = 'force-dynamic';

export default async function NvPage() {
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
  if (user.role === 'admin' || user.role === 'supervisor') {
    redirect('/cms');
  }

  const [commissions] = await Promise.all([
    fetchStaffCommissionsAction(),
  ]);

  return <NvClient initialCommissions={commissions} initialUser={user} />;
}
