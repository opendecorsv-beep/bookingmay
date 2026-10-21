import { fetchChatMessagesAction, getAuthUserAction } from "@/app/actions";
import ChatClient from "./ChatClient";

export const dynamic = 'force-dynamic';

export default async function NvChatPage() {
  const [messages, user] = await Promise.all([
    fetchChatMessagesAction(),
    getAuthUserAction(),
  ]);

  return <ChatClient initialMessages={messages} initialUser={user} />;
}
