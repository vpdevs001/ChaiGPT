"use client";

import { GitBranchIcon, GlobeIcon, SearchIcon } from "lucide-react";
import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type MessagePart = UIMessage["parts"][number];

// `MessagePart & {...}` (not `Extract<MessagePart, {...}>`) is what makes this work: the SDK
// types a tool part's discriminant as the template literal `tool-${string}`, which does NOT
// structurally extend the specific literal "tool-web_search" — so `Extract` collapses to `never`.
// An intersection instead just adds these fields on top of MessagePart, and is trivially
// assignable back to MessagePart, which satisfies TS's "predicate type must be assignable to
// the parameter type" rule without depending on any inference behavior.
type WebSearchToolPart = MessagePart & {
  type: "tool-web_search";
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
};

function isWebSearchToolPart(part: MessagePart): part is WebSearchToolPart {
  return part.type === "tool-web_search";
}

type SourceUrlPart = MessagePart & {
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
};

function isSourceUrlPart(part: MessagePart): part is SourceUrlPart {
  return part.type === "source-url";
}

function SearchStatus({ part }: { part: WebSearchToolPart }) {
  const isSearching = part.state === "input-streaming" || part.state === "input-available";
  const query = (part.input as { query?: string } | undefined)?.query;

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

function BranchButton({
  align,
  disabled,
  isBranching,
  onClick,
}: {
  align: "start" | "end";
  disabled?: boolean;
  isBranching?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Branch from this message"
      title="Branch from this message"
      className={cn(
        "flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-muted-foreground opacity-0",
        "transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-0",
        align === "end" ? "self-end" : "self-start",
      )}
    >
      {isBranching ? <Spinner className="size-3" /> : <GitBranchIcon className="size-3" />}
      Branch
    </button>
  );
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  onBranch?: (messageId: string) => void;
  branchingMessageId?: string;
};

export function ChatMessages({
  messages,
  status,
  onBranch,
  branchingMessageId,
}: ChatMessagesProps) {
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

              {onBranch ? (
                <BranchButton
                  align={message.role === "user" ? "end" : "start"}
                  disabled={status !== "ready"}
                  isBranching={branchingMessageId === message.id}
                  onClick={() => onBranch(message.id)}
                />
              ) : null}
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
