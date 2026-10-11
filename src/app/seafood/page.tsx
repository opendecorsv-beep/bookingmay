import { fetchSeafoodInventory } from "@/app/actions";
import SeafoodClient from "./SeafoodClient";

export const dynamic = 'force-dynamic';

export default async function SeafoodPage() {
  const initialData = await fetchSeafoodInventory();

  return <SeafoodClient initialData={initialData} />;
}
