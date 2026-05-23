import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useListOpenaiConversations, useListOpenaiMessages, useCreateOpenaiConversation, getListOpenaiMessagesQueryKey, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { Send, Plus, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Chat() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConversations } = useListOpenaiConversations();
  const { data: messages, isLoading: loadingMessages } = useListOpenaiMessages(activeId!, {
    query: { enabled: !!activeId, queryKey: getListOpenaiMessagesQueryKey(activeId!) }
  });

  const createConv = useCreateOpenaiConversation();

  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleCreate = () => {
    createConv.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveId(res.id);
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId || isStreaming) return;

    const userMessage = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistically update the UI if needed, but we'll rely on a refetch after stream or just stream
    const cacheKey = getListOpenaiMessagesQueryKey(activeId);
    
    try {
      // Add user message to cache
      queryClient.setQueryData(cacheKey, (old: any) => [
        ...(old || []),
        { id: Date.now(), role: "user", content: userMessage, conversationId: activeId }
      ]);

      const res = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage })
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              assistantMsg += data.content;
              setStreamingContent(assistantMsg);
            }
          }
        }
      }
      
      // Update cache with final message
      queryClient.setQueryData(cacheKey, (old: any) => [
        ...(old || []),
        { id: Date.now() + 1, role: "assistant", content: assistantMsg, conversationId: activeId }
      ]);

    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Sidebar */}
        <div className="w-72 border-r hidden md:flex flex-col bg-muted/20">
          <div className="p-4 border-b">
            <Button onClick={handleCreate} className="w-full justify-start gap-2" variant="outline">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            {loadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : conversations?.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "p-3 mb-1 rounded-lg cursor-pointer flex items-center gap-3 text-sm transition-colors",
                  activeId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground/80"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{c.title}</span>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
          >
            {loadingMessages && activeId ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : !messages?.length && !isStreaming ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <p>Start a conversation with your AI Nutritionist.</p>
              </div>
            ) : (
              messages?.map((msg) => (
                <div key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] md:max-w-[70%] p-4 rounded-2xl",
                    msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                  )}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {isStreaming && streamingContent && (
              <div className="flex w-full justify-start">
                <div className="max-w-[85%] md:max-w-[70%] p-4 rounded-2xl bg-muted rounded-tl-sm">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{streamingContent}<span className="animate-pulse">_</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-background border-t">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
              <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about healthy recipes, nutrition, or meal prep..." 
                className="pr-12 py-6 rounded-full shadow-sm"
                disabled={!activeId || isStreaming}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-2 h-10 w-10 rounded-full"
                disabled={!input.trim() || !activeId || isStreaming}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
