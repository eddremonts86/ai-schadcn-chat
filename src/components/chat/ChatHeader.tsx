/**
 * Chat header — brand mark, title/subtitle, and the control cluster
 * (personality, context documents, conversation history, theme toggle,
 * overflow). Rendered on a translucent, blurred bar that floats above the
 * message stream.
 */
import {
  Check,
  ChevronDown,
  FileText,
  History,
  MessageSquarePlus,
  MoreHorizontal,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useChat } from "../../hooks/useChat.js";
import {
  getActiveAgentId,
  listAgents,
  setActiveAgentId,
} from "../../lib/agents.js";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip.js";
import { AgentManager } from "./AgentManager.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { cn } from "../../lib/utils.js";
import type { Agent, PromptDocument } from "../../types/chat.js";

export interface ChatHeaderProps {
  className?: string;
}

export function ChatHeader({ className }: ChatHeaderProps) {
  const chat = useChat();
  const cfg = chat.config;
  const ui = cfg.ui ?? {};
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerCreate, setManagerCreate] = useState(false);
  const [activeAgentId, setActiveAgent] = useState<string | null>(() =>
    getActiveAgentId(),
  );

  const agents = listAgents();
  const activeAgent =
    agents.find((a) => a.id === activeAgentId) ??
    agents.find((a) => a.name === cfg.personality?.name);

  const applyAgent = (agent: Agent) => {
    chat.updateConfig({
      systemPrompt: agent.systemPrompt,
      personality: {
        ...cfg.personality,
        name: agent.name,
        tone: agent.tone,
        avatar: agent.icon,
        ...(agent.locale ? { locale: agent.locale } : {}),
      },
      ui: {
        ...ui,
        title: agent.name,
        ...(agent.suggestions && agent.suggestions.length > 0
          ? { suggestions: agent.suggestions }
          : {}),
      },
    });
    setActiveAgentId(agent.id);
    setActiveAgent(agent.id);
    setAgentsOpen(false);
  };

  const openManager = (create: boolean) => {
    setManagerCreate(create);
    setManagerOpen(true);
    setAgentsOpen(false);
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
      description: "Cites sources and flags primary vs. aggregated info.",
      alwaysOn: false,
      body: "When unsure, prefer citing authoritative web sources and link to them. Distinguish between primary sources and aggregators.",
    },
    {
      id: "built-in:code",
      name: "Code reviewer",
      description: "Checks bugs, security, perf, readability & test coverage.",
      alwaysOn: false,
      body: "When reviewing code, point out: 1) correctness bugs, 2) security implications, 3) performance, 4) readability, 5) test coverage. Suggest minimal patches.",
    },
    {
      id: "built-in:sql",
      name: "SQL guardrails",
      description: "Blocks unsafe SQL; requires WHERE clauses & parameters.",
      alwaysOn: false,
      body: "Never write destructive SQL without a WHERE clause. Prefer parameterized queries. Always state the table schema when joining.",
    },
  ];

  const docCount = cfg.documents?.length ?? 0;
  const conversations = chat.listConversationsMeta();

  return (
    <header
      className={cn(
        "relative z-20 flex items-center justify-between gap-2 border-b border-border/60 bg-background/70 px-3 py-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative grid size-9 shrink-0 place-items-center rounded-xl grad-primary text-primary-foreground shadow-sm glow-primary">
          {activeAgent?.icon ? (
            <span className="text-lg leading-none">{activeAgent.icon}</span>
          ) : (
            <Sparkles className="size-[18px]" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {ui.title ?? "Assistant"}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className="inline-block size-1.5 shrink-0 rounded-full bg-success shadow-[0_0_6px_currentColor]" />
            <span className="truncate">
              {ui.subtitle ?? (cfg.model.label || cfg.model.id || "Ready")}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Agents menu */}
        {(ui.showModelSelector ?? true) && (
          <DropdownMenu open={agentsOpen} onOpenChange={setAgentsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 max-w-[180px] gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
              >
                <span className="text-sm leading-none">
                  {activeAgent?.icon ?? "✨"}
                </span>
                <span className="truncate">
                  {activeAgent?.name ?? cfg.personality?.name ?? "Agent"}
                </span>
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Agents</DropdownMenuLabel>
              <div className="max-h-64 overflow-y-auto">
                {agents.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => applyAgent(a)}
                    className="gap-2"
                  >
                    <span className="text-base leading-none">
                      {a.icon ?? "🤖"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    {a.id === activeAgent?.id && (
                      <Check className="size-3.5 shrink-0 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openManager(true)}>
                <Plus className="size-3.5" />
                New agent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openManager(false)}>
                <Settings2 className="size-3.5" />
                Manage agents…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Documents menu */}
        {(ui.showDocumentPicker ?? true) && (
          <DropdownMenu open={docsOpen} onOpenChange={setDocsOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <FileText className="size-3.5" />
                    <span className="hidden sm:inline">Docs</span>
                    {docCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[9px] tabular-nums"
                      >
                        {docCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                Context documents — extra instructions prepended to the
                model&apos;s system prompt
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Context documents</DropdownMenuLabel>
              {builtInDocs.map((d) => {
                const active = (cfg.documents ?? []).some(
                  (x: PromptDocument) => x.id === d.id,
                );
                return (
                  <DropdownMenuItem
                    key={d.id}
                    onClick={() => toggleDoc(d)}
                    className="items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 truncate">
                        {d.name}
                        {active && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[9px]"
                          >
                            on
                          </Badge>
                        )}
                      </span>
                      {d.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {d.description}
                        </p>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Toggle a doc to prepend it to the model&apos;s context.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <span className="mx-1 hidden h-5 w-px bg-border/70 sm:block" />

        {/* New chat — direct action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="New chat"
              onClick={() => chat.newConversation()}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New chat</TooltipContent>
        </Tooltip>

        {/* Conversation history */}
        {(ui.enableConversationHistory ?? true) && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label="Conversation history"
                  >
                    <History className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>History</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Conversation history</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {conversations.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No conversations yet.
                  <br />
                  Send a message to start one.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {conversations.map((c) => {
                    const active = c.id === chat.conversationId;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "group/conv flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active ? "bg-accent" : "hover:bg-accent/60",
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => chat.setConversationId(c.id)}
                          className="h-auto min-w-0 flex-1 justify-start gap-2 p-0 text-left font-normal hover:bg-transparent"
                        >
                          {active ? (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          ) : (
                            <span className="size-3.5 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {c.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {c.messageCount} msg
                              {c.updatedAt ? ` · ${relativeTime(c.updatedAt)}` : ""}
                            </span>
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            chat.deleteConversation(c.id);
                          }}
                          className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 hover:text-destructive group-hover/conv:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ThemeToggle className="rounded-lg text-muted-foreground hover:text-foreground" />

        {/* Overflow */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="More"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openManager(false)}>
              <Settings2 className="size-3.5" />
              Manage agents…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => chat.clear()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Clear this conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AgentManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        activeAgentId={activeAgent?.id ?? null}
        onApply={applyAgent}
        startInCreate={managerCreate}
      />
    </header>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
