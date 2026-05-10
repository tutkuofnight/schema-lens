import { useMemo, useState, type FormEvent } from "react";
import { Bot, Key, Loader2, Send, Sparkles, X } from "lucide-react";
import { useDiagramStore } from "@/store/diagramStore";
import type { SchemaFormat } from "@/types/schema";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  schemaCode?: string;
  schemaApplied?: boolean;
};

type ChatCompletionMessage = {
  role: "system" | ChatRole;
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Tell me what kind of database schema you want. When I return a schema code block, SchemaLens will apply it to the editor and regenerate the diagram automatically.",
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getLanguageForFormat(format: SchemaFormat) {
  switch (format) {
    case "sql":
      return "sql";
    case "prisma":
      return "prisma";
    case "drizzle":
    default:
      return "typescript";
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL);
  return normalizedBaseUrl.endsWith("/chat/completions")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/chat/completions`;
}

function extractSchemaCode(content: string) {
  const codeBlockRegex =
    /```(?:\s*(sql|typescript|ts|tsx|javascript|js|prisma|graphql|drizzle))?\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1]?.toLowerCase();
    const code = match[2]?.trim();

    if (
      code &&
      (!language ||
        ["sql", "typescript", "ts", "tsx", "javascript", "js", "prisma", "graphql", "drizzle"].includes(
          language
        ))
    ) {
      return code;
    }
  }

  return null;
}

function buildSystemPrompt(format: SchemaFormat) {
  const language = getLanguageForFormat(format);

  return `You are the SchemaLens database schema agent.

Your job is to help users design database schemas and keep the SchemaLens code editor in sync.

Current preferred schema format: ${format}.
When the user asks you to create or update a schema, respond with a concise explanation and exactly one complete schema in a fenced \`\`\`${language} code block.
The code block must be self-contained and replace the current editor contents.
Prefer the current schema format unless the user explicitly asks for SQL, Prisma, or Drizzle.
For SQL, use valid CREATE TABLE statements with primary keys, foreign keys, NOT NULL where appropriate, and no trailing comma before the closing parenthesis.
For Prisma, use valid model blocks and relation fields.
For Drizzle, use valid TypeScript Drizzle table declarations.
If the user is only asking a question, answer normally and do not include a schema code block unless a code change is needed.
Match the user's language.`;
}

function buildContextMessage(code: string, format: SchemaFormat) {
  return `Current editor format: ${format}

Current editor contents:
\`\`\`${getLanguageForFormat(format)}
${code}
\`\`\``;
}

function getApiErrorMessage(response: ChatCompletionResponse) {
  return response.error?.message ?? "The AI provider returned an unexpected response.";
}

interface AgentChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaApplied?: () => void;
}

export function AgentChat({
  isOpen,
  onClose,
  onSchemaApplied,
}: AgentChatProps) {
  const { code, format, replaceCodeAndParse } = useDiagramStore();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => getChatCompletionsUrl(baseUrl), [baseUrl]);

  const applySchemaCode = (schemaCode: string) => {
    replaceCodeAndParse(schemaCode);
    onSchemaApplied?.();
  };

  const updateAppliedState = (messageId: string) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? { ...message, schemaApplied: true }
          : message
      )
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = input.trim();
    const trimmedApiKey = apiKey.trim();
    const trimmedModel = model.trim();

    if (!prompt || isLoading) {
      return;
    }

    if (!trimmedApiKey) {
      setError("Enter your API key to use Agent Chat.");
      return;
    }

    if (!trimmedModel) {
      setError("Enter a model name before sending a message.");
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: prompt,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    const requestMessages: ChatCompletionMessage[] = [
      { role: "system", content: buildSystemPrompt(format) },
      { role: "system", content: buildContextMessage(code, format) },
      ...nextMessages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${trimmedApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: trimmedModel,
          messages: requestMessages,
          temperature: 0.2,
        }),
      });

      const data = (await response.json()) as ChatCompletionResponse;

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data));
      }

      const assistantContent = data.choices?.[0]?.message?.content?.trim();

      if (!assistantContent) {
        throw new Error("The AI provider did not return a message.");
      }

      const schemaCode = extractSchemaCode(assistantContent) ?? undefined;
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantContent,
        schemaCode,
        schemaApplied: !!schemaCode,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);

      if (schemaCode) {
        applySchemaCode(schemaCode);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Agent Chat failed to complete the request.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside
      className={`fixed right-4 top-16 bottom-4 z-50 flex w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-2xl transition-all duration-300 ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-6 opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border-default p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated text-accent-blue">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">Agent Chat</h2>
            <p className="text-xs text-text-secondary">
              Uses your API key directly from this browser.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Close Agent Chat"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <section className="space-y-3 border-b border-border-default p-4">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
            <Key className="h-3.5 w-3.5" />
            API Key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-blue"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Base URL
            </span>
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-blue"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Model
            </span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-blue"
            />
          </label>
        </div>

        <p className="text-xs text-text-muted">
          Endpoint: <span className="font-mono">{endpoint}</span>. The key is
          not saved by SchemaLens.
        </p>
      </section>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-xl border p-3 ${
              message.role === "user"
                ? "ml-8 border-accent-blue/40 bg-accent-blue/10"
                : "mr-8 border-border-default bg-bg-primary"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {message.role === "user" ? "You" : "Agent"}
              </span>
              {message.schemaCode && (
                <button
                  type="button"
                  onClick={() => {
                    applySchemaCode(message.schemaCode as string);
                    updateAppliedState(message.id);
                  }}
                  className="rounded-md border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
                >
                  {message.schemaApplied ? "Applied" : "Apply schema"}
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-text-primary">
              {message.content}
            </p>
          </article>
        ))}

        {isLoading && (
          <div className="mr-8 flex items-center gap-2 rounded-xl border border-border-default bg-bg-primary p-3 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Agent is designing the schema...
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-border-default p-4">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
          Message
        </label>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Example: Create a chat app database schema with users, conversations, messages, and read receipts."
            rows={3}
            className="min-h-[84px] flex-1 resize-none rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-blue"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-green text-white transition-colors hover:bg-accent-green-light disabled:cursor-not-allowed disabled:bg-bg-elevated disabled:text-text-muted"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent-blue" />
          Press Cmd/Ctrl + Enter to send.
        </div>
      </form>
    </aside>
  );
}
