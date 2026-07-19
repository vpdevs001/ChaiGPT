import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { onBoard } from "@/features/auth/actions/onboard";
import { startNewChat } from "@/features/home/actions/start-new-chat";
import { LandingPage } from "@/features/home/components/landing-page";

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    await onBoard();
    const conversationId = await startNewChat();
    redirect(`/c/${conversationId}`);
  }

  return <LandingPage />;
}
