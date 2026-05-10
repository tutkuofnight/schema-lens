import { useMemo, useState, type FormEvent } from "react";
import { Bot, Key, Loader2, Send, Sparkles, X } from "lucide-react";
import { useDiagramStore } from "@/store/diagramStore";
import type { SchemaFormat } from "@/types/schema";

type ChatRole = "assistant" | "user";
type ProviderKind = "openai-compatible" | "anthropic";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  schemaCode?: string;
  schemaApplied?: boolean;
};

type ProviderPreset = {
  id: string;
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  apiKeyPlaceholder: string;
  note: string;
};

type ProviderRequest = {
  provider: ProviderPreset;
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  messages: ChatMessage[];
};

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type AnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
};

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyPlaceholder: "sk-...",
    note: "Uses the OpenAI Chat Completions API.",
  },
  {
    id: "anthropic",
    label: "Claude / Anthropic",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-latest",
    apiKeyPlaceholder: "sk-ant-...",
    note: "Uses Anthropic Messages API directly from the browser.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKeyPlaceholder: "sk-...",
    note: "DeepSeek exposes an OpenAI-compatible chat endpoint.",
  },
  {
    id: "kimi",
    label: "Kimi / Moonshot",
    kind: "openai-compatible",
    baseUrl: "https://api.moonshot.ai/v1",
    model: "moonshot-v1-8k",
    apiKeyPlaceholder: "sk-...",
    note: "Kimi is available through Moonshot's OpenAI-compatible API.",
  },
  {
    id: "gemini",
    label: "Gemini",
    kind: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    apiKeyPlaceholder: "AIza...",
    note: "Uses Google's OpenAI-compatible Gemini endpoint.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    apiKeyPlaceholder: "sk-or-...",
    note: "Use OpenRouter model ids such as anthropic/claude-3.5-sonnet.",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    apiKeyPlaceholder: "gsk_...",
    note: "Groq supports OpenAI-compatible chat completions.",
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai-compatible",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-large-latest",
    apiKeyPlaceholder: "...",
    note: "Mistral supports OpenAI-compatible chat completions.",
  },
  {
    id: "xai",
    label: "xAI",
    kind: "openai-compatible",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-2-latest",
    apiKeyPlaceholder: "xai-...",
    note: "xAI exposes an OpenAI-compatible API.",
  },
  {
    id: "custom-openai",
    label: "Custom OpenAI-compatible",
    kind: "openai-compatible",
    baseUrl: "https://api.example.com/v1",
    model: "your-model",
    apiKeyPlaceholder: "provider key",
    note: "For any provider that implements /chat/completions.",
  },
  {
    id: "custom-anthropic",
    label: "Custom Anthropic-compatible",
    kind: "anthropic",
    baseUrl: "https://api.example.com/v1",
    model: "your-claude-model",
    apiKeyPlaceholder: "provider key",
    note: "For Anthropic-compatible Messages API providers.",
  },
];

const DEFAULT_PROVIDER = PROVIDER_PRESETS[0];

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

function getProviderEndpoint(provider: ProviderPreset, baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl || provider.baseUrl);

  if (provider.kind === "anthropic") {
    return normalizedBaseUrl.endsWith("/messages")
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/messages`;
  }

  return normalizedBaseUrl.endsWith("/chat/completions")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/chat/completions`;
}

function extractSchemaCode(content: string) {
  const codeBlockRegex =
    /```(?:\s*(sql|typescript|ts|tsx|javascript|js|prisma|graphql|drizzle))?\s*\n([\s\S]*?)```/gi;
  const supportedLanguages = [
    "sql",
    "typescript",
    "ts",
    "tsx",
    "javascript",
    "js",
    "prisma",
    "graphql",
    "drizzle",
  ];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1]?.toLowerCase();
    const code = match[2]?.trim();

    if (code && (!language || supportedLanguages.includes(language))) {
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

function getProviderErrorMessage(
  response: OpenAICompatibleResponse | AnthropicResponse
) {
  return (
    response.error?.message ?? "The AI provider returned an unexpected response."
  );
}

function getOpenAICompatibleContent(response: OpenAICompatibleResponse) {
  return response.choices?.[0]?.message?.content?.trim();
}

function getAnthropicContent(response: AnthropicResponse) {
  return response.content
    ?.map((part) => (part.type === "text" || !part.type ? part.text ?? "" : ""))
    .join("")
    .trim();
}

async function sendOpenAICompatibleRequest({
  provider,
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
}: ProviderRequest) {
  const response = await fetch(getProviderEndpoint(provider, baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      temperature: 0.2,
    }),
  });

  const data = (await response.json()) as OpenAICompatibleResponse;

  if (!response.ok) {
    throw new Error(getProviderErrorMessage(data));
  }

  const content = getOpenAICompatibleContent(data);

  if (!content) {
    throw new Error("The AI provider did not return a message.");
  }

  return content;
}

async function sendAnthropicRequest({
  provider,
  apiKey,
  model,
  baseUrl,
  systemPrompt,
  messages,
}: ProviderRequest) {
  const response = await fetch(getProviderEndpoint(provider, baseUrl), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  const data = (await response.json()) as AnthropicResponse;

  if (!response.ok) {
    throw new Error(getProviderErrorMessage(data));
  }

  const content = getAnthropicContent(data);

  if (!content) {
    throw new Error("The AI provider did not return a message.");
  }

  return content;
}

function sendProviderRequest(request: ProviderRequest) {
  if (request.provider.kind === "anthropic") {
    return sendAnthropicRequest(request);
  }

  return sendOpenAICompatibleRequest(request);
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
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER.id);
  const provider =
    PROVIDER_PRESETS.find((preset) => preset.id === providerId) ??
    DEFAULT_PROVIDER;
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [model, setModel] = useState(provider.model);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => getProviderEndpoint(provider, baseUrl),
    [baseUrl, provider]
  );

  const handleProviderChange = (nextProviderId: string) => {
    const nextProvider =
      PROVIDER_PRESETS.find((preset) => preset.id === nextProviderId) ??
      DEFAULT_PROVIDER;

    setProviderId(nextProvider.id);
    setBaseUrl(nextProvider.baseUrl);
    setModel(nextProvider.model);
    setApiKey("");
    setError(null);
  };

  const handleClose = () => {
    setApiKey("");
    setError(null);
    onClose();
  };

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
      setError("Enter your provider API key to use Agent Chat.");
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

    try {
      const assistantContent = await sendProviderRequest({
        provider,
        apiKey: trimmedApiKey,
        model: trimmedModel,
        baseUrl,
        systemPrompt: `${buildSystemPrompt(format)}

${buildContextMessage(code, format)}`,
        messages: nextMessages.slice(-8),
      });

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
      setApiKey("");
    }
  };

  return (
    <aside
      className={`fixed right-4 top-16 bottom-4 z-50 flex w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-2xl transition-all duration-300 ${
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
              Provider keys are cleared after each request and on close.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Close Agent Chat"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <section className="space-y-3 border-b border-border-default p-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
            Provider
          </span>
          <select
            value={providerId}
            onChange={(event) => handleProviderChange(event.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-blue"
          >
            {PROVIDER_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
            <Key className="h-3.5 w-3.5" />
            API Key
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={provider.apiKeyPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-blue"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Base URL
            </span>
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              autoComplete="off"
              spellCheck={false}
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
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-blue"
            />
          </label>
        </div>

        <p className="text-xs text-text-muted">
          {provider.note} Endpoint: <span className="font-mono">{endpoint}</span>
          . SchemaLens never writes provider keys to localStorage, the store, or
          a backend, and clears the input after every request.
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

      <form
        onSubmit={handleSubmit}
        className="border-t border-border-default p-4"
        autoComplete="off"
      >
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
