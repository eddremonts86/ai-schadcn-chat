/**
 * Chat header with model + personality + documents menu, conversation
 * list, theme toggle, and a clear/reset button.
 */
import {
  Bot,
  Brain,
  ChevronDown,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useChat } from "../../hooks/useChat.js";
import {
  defaultPersonalityPresets,
  defaultSystemPresets,
} from "../../types/presets.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import { cn } from "../../lib/utils.js";
import type { PersonalityConfig, PromptDocument } from "../../types/chat.js";

export interface ChatHeaderProps {
  className?: string;
}

export function ChatHeader({ className }: ChatHeaderProps) {
  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};
  const [personalityOpen, setPersonalityOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  const applyPersonality = (preset: PersonalityConfig) => {
    chat.updateConfig({ personality: { ...cfg.personality, ...preset } });
    setPersonalityOpen(false);
  };

  const applySystem = (key: keyof typeof defaultSystemPresets) => {
    chat.updateConfig({ systemPrompt: defaultSystemPresets[key] });
  };

  const toggleDoc = (doc: PromptDocument) => {
    const current: PromptDocument[] = cfg.documents ?? [];
    const next = current.find((d: PromptDocument) => d.id === doc.id)
      ? current.filter((d: PromptDocument) => d.id !== doc.id)
      : [...current, doc];
    chat.updateConfig({ documents: next });
  };

  const builtInDocs: PromptDocument[] = [
    {
      id: "built-in:web",
      name: "Web search guidance",
      alwaysOn: false,
      body: "When unsure, prefer citing authoritative web sources and link to them. Distinguish between primary sources and aggregators.",
    },
    {
      id: "built-in:code",
      name: "Code reviewer",
      alwaysOn: false,
      body: "When reviewing code, point out: 1) correctness bugs, 2) security implications, 3) performance, 4) readability, 5) test coverage. Suggest minimal patches.",
    },
    {
      id: "built-in:sql",
      name: "SQL guardrails",
      alwaysOn: false,
      body: "Never write destructive SQL without a WHERE clause. Prefer parameterized queries. Always state the table schema when joining.",
    },
  ];

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-2 border-b bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {ui.title ?? "Chat"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ui.subtitle ?? (
              <>
                {cfg.personality?.name ?? "Assistant"} · {cfg.model.label ?? cfg.model.id}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Personality menu */}
        {(ui.showModelSelector ?? true) && (
          <DropdownMenu open={personalityOpen} onOpenChange={setPersonalityOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                <Brain className="h-3 w-3" />
                {cfg.personality?.name ?? "Personality"}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Personality preset</DropdownMenuLabel>
              {Object.entries(defaultPersonalityPresets).map(([key, p]) => (
                <DropdownMenuItem key={key} onClick={() => applyPersonality(p)}>
                  <span>{p.name}</span>
                  {cfg.personality?.name === p.name && (
                    <Badge variant="secondary" className="ml-auto text-[9px]">on</Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>System prompt</DropdownMenuLabel>
              {Object.entries(defaultSystemPresets).map(([key, value]) => (
                <DropdownMenuItem key={key} onClick={() => applySystem(key as keyof typeof defaultSystemPresets)}>
                  <span className="capitalize">{key}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Documents menu */}
        {(ui.showDocumentPicker ?? true) && (
          <DropdownMenu open={docsOpen} onOpenChange={setDocsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                <FileText className="h-3 w-3" />
                Docs
                {(cfg.documents?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[9px]">
                    {cfg.documents?.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Context documents</DropdownMenuLabel>
              {builtInDocs.map((d) => {
                const active = (cfg.documents ?? []).some((x: PromptDocument) => x.id === d.id);
                return (
                  <DropdownMenuItem key={d.id} onClick={() => toggleDoc(d)}>
                    <span className="truncate">{d.name}</span>
                    {active && <Badge variant="secondary" className="ml-auto text-[9px]">on</Badge>}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Custom docs via config.documents</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Conversation history */}
        {(ui.enableConversationHistory ?? true) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Conversations">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Conversations</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => chat.newConversation()}>
                <Plus className="h-3 w-3" />
                New conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {chat.listConversations().length === 0 ? (
                <DropdownMenuItem disabled>No conversations yet</DropdownMenuItem>
              ) : (
                chat.listConversations().map((id) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => chat.setConversationId(id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate font-mono text-xs">{id}</span>
                    {id === chat.conversationId && (
                      <Badge variant="secondary" className="ml-2 text-[9px]">
                        current
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Overflow */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="more">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => chat.clear()}>
              <Trash2 className="h-3 w-3" />
              Clear current conversation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chat.newConversation()}>
              <Plus className="h-3 w-3" />
              Start a new one
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}