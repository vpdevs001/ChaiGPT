import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";

import { getChatModel } from "@/features/ai/utils/models";
import { requireUser } from "@/features/auth/actions/require-user";
import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { prisma } from "@/lib/db";

export const maxDuration = 30;

const SYSTEM_PROMPT =
  "You are ChaiGPT, a helpful assistant. Use the web_search tool whenever the user asks " +
  "about something that may have happened after your training cutoff, or that otherwise " +
  "needs current, up-to-date, or real-time information.";

export async function POST(req: Request) {
  await auth.protect();

  const {
    message,
    id,
    searchEnabled,
  }: { message: UIMessage; id: string; searchEnabled?: boolean } = await req.json();

  if (!message || !id) {
    return new Response("Missing message or conversation id", { status: 400 });
  }

  const user = await requireUser();
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const previousMessages = await loadChatMessages(id);
  const alreadySaved = previousMessages.some((storedMessage) => storedMessage.id === message.id);
  const messages = alreadySaved ? previousMessages : [...previousMessages, message];

  if (!alreadySaved) {
    await saveChatMessages(id, [message]);
  }

  const result = streamText({
    model: getChatModel(conversation.model),
    system: conversation.systemPrompt ?? SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      web_search: openai.tools.webSearch({}),
    },
    // When the user has the search toggle on, force a search on every turn instead of
    // leaving it to the model's judgement.
    ...(searchEnabled ? { toolChoice: { type: "tool", toolName: "web_search" } } : {}),
  });

  // Keep saving even if the browser disconnects mid-stream.
  result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages: finalMessages }) => {
        try {
          await saveChatMessages(id, finalMessages, { updateTitle: false });
        } catch (error) {
          console.error("Failed to save chat messages", error);
        }
      },
    }),
  });
}
