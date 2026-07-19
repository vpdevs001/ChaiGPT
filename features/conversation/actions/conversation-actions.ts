"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/actions/require-user";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export type ConversationListItem = {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

async function assertOwnsConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

/** List the current user's conversations (newest activity first). */
export async function listConversations(): Promise<ConversationListItem[]> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
    select: {
      id: true,
      title: true,
      isPinned: true,
      isArchived: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Get one conversation owned by the current user. */
export async function getConversation(conversationId: string) {
  const user = await requireUser();
  return assertOwnsConversation(conversationId, user.id);
}

/** Create a new empty chat. */
export async function createConversation(title = "New Chat") {
  const user = await requireUser();

  return prisma.conversation.create({
    data: {
      userId: user.id,
      title: title.trim() || "New Chat",
    },
  });
}

/** Rename a conversation. */
export async function updateConversation(
  conversationId: string,
  data: { title?: string; isPinned?: boolean; isArchived?: boolean },
) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() || "New Chat" } : {}),
      ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`/c/${conversationId}`);
  return conversation;
}

/** Permanently delete a conversation and its messages. */
export async function deleteConversation(conversationId: string) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  revalidatePath("/");
  return { id: conversationId };
}

/**
 * Clone a conversation into a new "branch - <title>" chat.
 *
 * If `upToMessageId` is given, only messages up to and including it are copied
 * (branching off from that point); otherwise the whole conversation is cloned.
 */
export async function branchConversation(conversationId: string, upToMessageId?: string) {
  const user = await requireUser();
  const original = await assertOwnsConversation(conversationId, user.id);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const cutoffIndex = upToMessageId
    ? messages.findIndex((message) => message.id === upToMessageId)
    : messages.length - 1;

  if (cutoffIndex === -1) {
    throw new Error("Message not found");
  }

  const messagesToClone = messages.slice(0, cutoffIndex + 1);

  const branch = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        userId: user.id,
        title: `branch - ${original.title}`,
        model: original.model,
        systemPrompt: original.systemPrompt,
        lastMessageAt: new Date(),
      },
    });

    if (messagesToClone.length > 0) {
      await tx.message.createMany({
        data: messagesToClone.map((message, index) => ({
          conversationId: conversation.id,
          role: message.role,
          status: message.status,
          content: message.content,
          parts: (message.parts ?? undefined) as Prisma.InputJsonValue | undefined,
          metadata: (message.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          // Offset by index (ms) to guarantee strict ordering even if two source
          // messages happened to share a timestamp.
          createdAt: new Date(message.createdAt.getTime() + index),
        })),
      });
    }

    return conversation;
  });

  revalidatePath("/");
  return branch;
}
