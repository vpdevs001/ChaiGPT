"use client";

import { GlobeIcon, SearchIcon } from "lucide-react";
import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";

function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type WebSearchToolPart = {
  type: "tool-web_search";
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: { query?: string };
};

function isWebSearchToolPart(part: UIMessage["parts"][number]): part is WebSearchToolPart {
  return part.type === "tool-web_search";
}

type SourceUrlPart = {
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
};

function isSourceUrlPart(part: UIMessage["parts"][number]): part is SourceUrlPart {
  return part.type === "source-url";
}

function SearchStatus({ part }: { part: WebSearchToolPart }) {
  const isSearching = part.state === "input-streaming" || part.state === "input-available";
  const query = part.input?.query;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        isSearching && "animate-pulse",
      )}
    >
      <GlobeIcon className="size-3.5" />
      <span>
        {isSearching ? "Searching the web" : "Searched the web"}
        {query ? ` for "${query}"` : ""}
      </span>
    </div>
  );
}

function SourceList({ sources }: { sources: SourceUrlPart[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t pt-2 text-xs">
      <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
      {sources.map((source) => {
        let hostname = source.url;
        try {
          hostname = new URL(source.url).hostname.replace(/^www\./, "");
        } catch {
          // Keep the raw url if it's not parseable.
        }

        return (
          <a
            key={source.sourceId}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            title={source.title ?? source.url}
            className="rounded-full border bg-muted/50 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {hostname}
          </a>
        );
      })}
    </div>
  );
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
};

export function ChatMessages({ messages, status }: ChatMessagesProps) {
  const isWaiting = status === "submitted" && messages.at(-1)?.role === "user";

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => {
          const searchParts = message.parts.filter(isWebSearchToolPart);
          const sourceParts = message.parts.filter(isSourceUrlPart);

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {searchParts.map((part) => (
                  <SearchStatus key={part.toolCallId} part={part} />
                ))}
                <MessageResponse>{getMessageText(message)}</MessageResponse>
                <SourceList sources={sourceParts} />
              </MessageContent>
            </Message>
          );
        })}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
    </Conversation>
  );
}
