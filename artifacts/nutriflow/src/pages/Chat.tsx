import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  Loader2,
  History,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ProfileContextIndicator } from "@/components/chat/ProfileContextIndicator";
import { DomainQuickActions, DomainFilterStrip } from "@/components/chat/DomainQuickActions";

// ─── Chat Message Types ────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "status" | "assistant";
  content: string;
  timestamp?: string;
}

// ─── Controlled Copilot Status Card ────────────────────────────────────────────

function CopilotStatusCard({ message }: { message?: string }) {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[95%] sm:max-w-[85%] w-full bg-muted/40 rounded-2xl p-4 border border-border/80 text-left space-y-2 shadow-2xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground">AI Copilot Status</span>
          <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Phase 1 Foundation
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {message || "AI Copilot is being connected. Live AI generation, personalized meal recommendations, and Swiggy conversational actions will be enabled in Phase 2."}
        </p>
      </div>
    </div>
  );
}

// ─── Main Chat Page Component ──────────────────────────────────────────────────

export default function Chat() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load real user conversations from backend database
  const loadConversations = async () => {
    try {
      if (!user) {
        setConversations([]);
        return;
      }

      const res = await fetch("/api/openai/conversations", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        setConversations([]);
        return;
      }

      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("[Chat] loadConversations failed (non-critical):", e);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load messages for active conversation
  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/openai/conversations/${encodeURIComponent(convId)}/messages`,
        {
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );

      if (!res.ok) {
        setMessages([]);
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        // Map messages: user messages display normally.
        // Any mock/fallback assistant messages are displayed as controlled status states, not fake AI responses.
        const mapped: ChatMessage[] = data.map((m: any) => {
          if (m.role === "user") {
            return {
              id: String(m.id || Math.random()),
              role: "user",
              content: m.content,
            };
          }
          // Assistant or fallback entries are shown as controlled UI status notices
          return {
            id: String(m.id || Math.random()),
            role: "status",
            content: "AI Copilot is being connected. Real AI responses will be enabled in Phase 2.",
          };
        });
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.warn("[Chat] loadMessages failed (non-critical):", e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Create new conversation
  const handleCreate = async () => {
    try {
      const res = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: "New Wellness Chat",
        }),
      });

      if (!res.ok) throw new Error("Failed to create conversation");
      const data = await res.json();
      setConversations((old) => [data, ...old]);
      setActiveId(data.id);
      setMessages([]);
      setIsMobileHistoryOpen(false);
    } catch (e) {
      console.error("Failed to create conversation:", e);
      toast({ title: "Failed to create conversation", variant: "destructive" });
    }
  };

  // Quick prompt handler: sets input and initializes a conversation if needed
  const handleQuickPrompt = async (promptText: string) => {
    if (isSending) return;
    let targetConvId = activeId;

    if (!targetConvId) {
      try {
        const title = promptText.length > 25 ? promptText.slice(0, 25) + "..." : promptText;
        const res = await fetch("/api/openai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title }),
        });

        if (!res.ok) throw new Error("Failed to initialize conversation");
        const data = await res.json();
        setConversations((old) => [data, ...old]);
        targetConvId = data.id;
        setActiveId(data.id);
      } catch (e) {
        console.error("Failed to create conversation for prompt:", e);
        return;
      }
    }

    setInput(promptText);
  };

  // Send message handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    setInput("");
    setIsSending(true);

    let currentConvId = activeId;

    // Create conversation on the fly if none is selected
    if (!currentConvId) {
      try {
        const title = userText.length > 25 ? userText.slice(0, 25) + "..." : userText;
        const res = await fetch("/api/openai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title }),
        });

        if (res.ok) {
          const conv = await res.json();
          setConversations((old) => [conv, ...old]);
          currentConvId = conv.id;
          setActiveId(conv.id);
        }
      } catch (e) {
        console.error("Failed to auto-create conversation:", e);
      }
    }

    const optimisticUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
    };

    const controlledStatusMsg: ChatMessage = {
      id: `status-${Date.now()}`,
      role: "status",
      content: "AI Copilot is being connected. Live AI generation, personalized meal recommendations, and Swiggy conversational actions will be enabled in Phase 2.",
    };

    // Render user message and controlled status state immediately
    setMessages((old) => [...old, optimisticUserMsg, controlledStatusMsg]);

    try {
      // Save user message to backend conversation history if currentConvId exists
      if (currentConvId) {
        await fetch(`/api/openai/conversations/${currentConvId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: userText,
          }),
        }).catch((err) => {
          console.warn("[Chat] Background message save non-critical:", err);
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const activeConversationTitle =
    conversations.find((c) => c.id === activeId)?.title || "AI Copilot";

  return (
    <Layout contentClassName="p-0 pb-16 md:pb-0" fullWidth={true}>
      <div className="flex h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-4rem)] bg-background overflow-hidden">
        {/* ─── Desktop Left Sidebar (Conversation History) ─── */}
        <aside className="w-64 lg:w-72 border-r border-border/70 hidden md:flex flex-col bg-muted/15">
          <div className="p-3.5 border-b border-border/70 flex items-center justify-between gap-2">
            <Button
              onClick={handleCreate}
              className="w-full justify-start gap-2 h-9 font-semibold rounded-xl text-xs"
              variant="outline"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>New Conversation</span>
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            {loadingConversations ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading chats...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground leading-relaxed">
                No saved conversations yet. Start a new chat to begin.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full p-2.5 mb-1 rounded-xl cursor-pointer flex items-center gap-2 text-xs transition-all text-left",
                    activeId === c.id
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  <span className="truncate flex-1">{c.title}</span>
                </button>
              ))
            )}
          </ScrollArea>
        </aside>

        {/* ─── Main Chat Window ─── */}
        <section className="flex-1 flex flex-col min-w-0 bg-background relative">
          {/* Header Bar */}
          <header className="border-b border-border/70 px-4 py-2.5 bg-background/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-foreground truncate">
                    NutriFlow Copilot
                  </h1>
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.2 rounded-md">
                    Wellness AI
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeId ? activeConversationTitle : "Your personalized nutrition assistant"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Mobile History Drawer Trigger */}
              <Sheet open={isMobileHistoryOpen} onOpenChange={setIsMobileHistoryOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden h-8 px-2.5 text-xs rounded-xl gap-1.5 border-border/80"
                    aria-label="View Chat History"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Chats</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b border-border/70 text-left">
                    <SheetTitle className="text-sm font-bold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span>Past Conversations</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-3 border-b border-border/60">
                    <Button
                      onClick={handleCreate}
                      className="w-full justify-start gap-2 h-9 text-xs rounded-xl"
                      variant="outline"
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <span>New Chat</span>
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 p-2">
                    {conversations.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground leading-relaxed">
                        No saved conversations yet. Start a new chat to begin.
                      </div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setActiveId(c.id);
                            setIsMobileHistoryOpen(false);
                          }}
                          className={cn(
                            "w-full p-2.5 mb-1 rounded-xl flex items-center gap-2 text-xs transition-all text-left",
                            activeId === c.id
                              ? "bg-primary/10 text-primary font-bold border border-primary/20"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                          <span className="truncate flex-1">{c.title}</span>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* New Chat Button for desktop / quick action */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreate}
                className="hidden md:inline-flex h-8 px-2.5 text-xs rounded-xl gap-1 border-border/80"
                title="Start a new chat"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </Button>
            </div>
          </header>

          {/* Profile Context Indicator */}
          <ProfileContextIndicator />

          {/* Conversation Thread / Welcome Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="max-w-3xl mx-auto w-full space-y-4">
              {loadingMessages && activeId ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-xs sm:text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                  <span>Loading conversation...</span>
                </div>
              ) : !messages?.length && !isSending ? (
                /* ─── Copilot Welcome / Empty State ─── */
                <div className="py-6 sm:py-10 flex flex-col items-center justify-center text-center space-y-6">
                  {/* Avatar Icon */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-inner border border-primary/20">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      Hi, I'm your NutriFlow Copilot
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      I can help you make everyday food decisions, plan Instamart grocery baskets, and discover healthy dining options.
                    </p>
                  </div>

                  {/* Profile Alignment Note */}
                  {user?.goal && (
                    <div className="inline-flex items-center gap-1.5 bg-muted/60 text-muted-foreground px-3 py-1 rounded-full text-[11px] font-medium border border-border/60">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Configured for your "{user.goal}" goal</span>
                    </div>
                  )}

                  {/* Domain Quick Actions Prompt Cards */}
                  <div className="w-full pt-2">
                    <DomainQuickActions onSelectPrompt={handleQuickPrompt} />
                  </div>
                </div>
              ) : (
                /* ─── Message Bubbles ─── */
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-primary text-primary-foreground text-xs sm:text-sm font-medium leading-relaxed shadow-2xs text-left">
                        {msg.content}
                      </div>
                    ) : (
                      <CopilotStatusCard message={msg.content} />
                    )}
                  </div>
                ))
              )}

              {/* ─── Sending Indicator ─── */}
              {isSending && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[95%] sm:max-w-[85%] w-full bg-card rounded-2xl rounded-tl-xs p-3.5 border border-border/80 shadow-2xs text-left">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Processing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Message Composer ─── */}
          <footer className="p-3 sm:p-4 border-t border-border/70 bg-background/95 backdrop-blur-xs shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Quick Prompt Strip */}
              <DomainFilterStrip onSelectPrompt={handleQuickPrompt} />

              {/* Form Input */}
              <form
                id="chat-form"
                onSubmit={handleSend}
                className="flex items-center gap-2 relative"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    activeId
                      ? "Ask NutriFlow anything about food or wellness..."
                      : "Type a question or pick a prompt above..."
                  }
                  className="pr-12 py-5 rounded-2xl text-xs sm:text-sm bg-card border-border/80 focus-visible:ring-primary shadow-2xs"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1.5 h-8.5 w-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs transition-all disabled:opacity-40"
                  disabled={!input.trim() || isSending}
                  aria-label="Send Message"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Safety & Medical Disclaimer */}
              <p className="text-[10px] text-center text-muted-foreground leading-normal px-2">
                NutriFlow Copilot provides general wellness information. For medical or allergy-specific advice, consult a healthcare professional.
              </p>
            </div>
          </footer>
        </section>
      </div>
    </Layout>
  );
}
