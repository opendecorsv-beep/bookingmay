import { getPartyMenuSets } from "@/lib/store";
import PartyMenuClient from "./PartyMenuClient";

export const dynamic = 'force-dynamic';

export default async function PartyMenuPage() {
  const partyMenuSets = await getPartyMenuSets();

  return <PartyMenuClient initialSets={partyMenuSets} />;
}
