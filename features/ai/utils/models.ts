import { openai } from "@ai-sdk/openai";

/** OpenAI model id used for chat (via @ai-sdk/openai + OPENAI_API_KEY). */
export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

/**
 * Uses the Responses API (`openai.responses`) rather than Chat Completions, since the
 * built-in `web_search` tool is only available through the Responses API.
 */
export function getChatModel(modelId?: string | null) {
  return openai.responses(modelId || DEFAULT_CHAT_MODEL);
}
