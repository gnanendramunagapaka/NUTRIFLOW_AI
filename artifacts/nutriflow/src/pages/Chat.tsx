import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Plus, MessageSquare, Flame, Dumbbell, Heart, Utensils, Check, Loader2, ShoppingCart, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_PREVIOUS_CHATS } from "@/lib/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recommendation {
  mealTitle: string;
  calories: number;
  protein: number;
  cuisine: string;
  healthScore: number;
  groceryItems: string[];
  reason: string;
}

interface GroceryItem {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  nutritionNote?: string;
}

interface ParsedAIMessage {
  text: string;
  recommendation?: Recommendation;
  wellnessInsight?: string;
  groceryPlan?: GroceryItem[];
}

// ─── Content Parser ────────────────────────────────────────────────────────────

function parseAIContent(content: string): { displayText: string; parsed: ParsedAIMessage | null } {
  const trimmed = content.trim();

  if (!trimmed) return { displayText: "", parsed: null };

  // Not JSON — plain text response
  if (!trimmed.startsWith("{")) {
    return { displayText: trimmed, parsed: null };
  }

  // Try full JSON parse
  try {
    const obj = JSON.parse(trimmed) as ParsedAIMessage;
    return { displayText: obj.text || "", parsed: obj };
  } catch {
    const match = trimmed.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
    if (match && match[1]) {
      let text = match[1];
      try {
        text = JSON.parse(`"${text}"`);
      } catch {
        text = text.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      return { displayText: text, parsed: null };
    }
    return { displayText: "", parsed: null };
  }
}

// ─── AI Message Bubble ─────────────────────────────────────────────────────────

function AIMessageBubble({
  content,
  onAddGroceries,
}: {
  content: string;
  onAddGroceries: (items: GroceryItem[]) => Promise<void>;
}) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { addToCart, setIsCartOpen } = useCart();
  const [mealAdded, setMealAdded] = useState(false);
  const [groceriesAdded, setGroceriesAdded] = useState(false);

  const { displayText, parsed } = parseAIContent(content);

  const handleAddIngredients = async (items: string[]) => {
    setLoading(true);
    try {
      await onAddGroceries(
        items.map((name) => ({ name, category: "Pantry", quantity: "1", unit: "unit" }))
      );
      setAdded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = async (items: GroceryItem[]) => {
    setLoading(true);
    try {
      await onAddGroceries(items);
      setAdded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMealToCart = () => {
    if (!parsed?.recommendation) return;
    const rawPrice = Math.max(140, Math.min(320, ((parsed.recommendation.protein || 20) * 4) + 120)) || 180;
    const price = Math.round(rawPrice);
    
    addToCart({
      id: `meal-ai-${parsed.recommendation.mealTitle.toLowerCase().replace(/\s+/g, "-")}`,
      name: parsed.recommendation.mealTitle,
      price,
      type: 'meal',
      calories: parsed.recommendation.calories,
      protein: parsed.recommendation.protein,
      healthScore: parsed.recommendation.healthScore,
      cuisine: parsed.recommendation.cuisine,
      description: parsed.recommendation.reason,
    });
    setMealAdded(true);
    toast({
      title: "Added to Cart! 🛒",
      description: `"${parsed.recommendation.mealTitle}" added to Swiggy commerce basket.`,
    });
    setIsCartOpen(true);
  };

  const handleAddGroceryPlanToCart = () => {
    if (!parsed?.groceryPlan || parsed.groceryPlan.length === 0) return;
    
    parsed.groceryPlan.forEach((item) => {
      addToCart({
        id: `grocery-ai-${item.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: item.name,
        price: 49,
        type: 'grocery',
        category: item.category,
        unit: item.unit,
        description: item.nutritionNote,
      });
    });
    setGroceriesAdded(true);
    toast({
      title: "Grocery Items Added! 🛒",
      description: `${parsed.groceryPlan.length} ingredients transferred to Swiggy Instamart pipeline.`,
    });
    setIsCartOpen(true);
  };

  return (
    <div className="space-y-4 w-full">
      {displayText ? (
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-left">{displayText}</p>
      ) : !parsed ? (
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap text-left">{content}</p>
      ) : null}

      {parsed?.wellnessInsight && (
        <Card className="bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Copilot Insight</span>
              <p className="text-sm text-emerald-900/90 dark:text-emerald-200/90 italic mt-0.5">{parsed.wellnessInsight}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {parsed?.recommendation && (
        <Card className="border border-emerald-100 dark:border-emerald-900 shadow-md rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50/40 to-background dark:from-emerald-950/10 dark:to-background">
          <div className="p-5 space-y-4 text-left">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 py-0.5 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-full">
                  Recommended Meal
                </span>
                <h3 className="text-base font-bold text-foreground mt-2">{parsed.recommendation.mealTitle}</h3>
              </div>
              <div className="flex gap-2 items-center">
                {parsed.recommendation.cuisine && (
                  <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                    {parsed.recommendation.cuisine}
                  </span>
                )}
                {parsed.recommendation.healthScore !== undefined && (
                  <span className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1",
                    parsed.recommendation.healthScore >= 80
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  )}>
                    <Heart className="h-3 w-3 fill-current" /> {parsed.recommendation.healthScore}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/40 p-3 rounded-xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Calories</p>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-300">{parsed.recommendation.calories} kcal</p>
                </div>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/40 p-3 rounded-xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Dumbbell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Protein</p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{parsed.recommendation.protein}g</p>
                </div>
              </div>
            </div>

            {parsed.recommendation.reason && (
              <p className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-xl border border-border/30">
                "{parsed.recommendation.reason}"
              </p>
            )}

            {parsed.recommendation.groceryItems?.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 text-emerald-600" /> Key Ingredients
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.recommendation.groceryItems.map((item, i) => (
                    <span key={i} className="text-xs bg-muted/60 border border-border/70 px-2.5 py-1 rounded-lg">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddIngredients(parsed!.recommendation!.groceryItems)}
                    disabled={loading || added}
                    variant="outline"
                    className="flex-1 rounded-xl h-10 font-medium transition-all border-emerald-200 text-emerald-800 hover:bg-emerald-50/50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : added ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {added ? "Added ✓" : "Add to List"}
                  </Button>
                  <Button
                    onClick={handleAddMealToCart}
                    disabled={mealAdded}
                    className="flex-1 rounded-xl h-10 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 transition-all hover-elevate"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {mealAdded ? "Added ✓" : `Order Meal (₹${Math.round(Math.max(140, Math.min(320, ((parsed.recommendation.protein || 20) * 4) + 120)) || 180)})`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {parsed?.groceryPlan && parsed.groceryPlan.length > 0 && (
        <Card className="border border-emerald-100 dark:border-emerald-900 shadow-md rounded-2xl overflow-hidden">
          <div className="p-5 space-y-4 text-left">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 py-0.5 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-full">
              AI Grocery Plan
            </span>
            <div className="space-y-4 pt-1">
              {Object.entries(
                parsed.groceryPlan.reduce<Record<string, GroceryItem[]>>((acc, item) => {
                  const cat = item.category || "Pantry";
                  (acc[cat] ||= []).push(item);
                  return acc;
                }, {})
              ).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider border-b border-emerald-100/40 pb-1 mb-2">
                    {category}
                  </h4>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start justify-between text-xs">
                        <div>
                          <span className="font-semibold text-foreground">{item.name}</span>
                          {item.nutritionNote && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.nutritionNote}</p>
                          )}
                        </div>
                        <span className="shrink-0 bg-muted text-muted-foreground px-2 py-0.5 rounded ml-3 font-semibold">
                          {item.quantity} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAddPlan(parsed!.groceryPlan!)}
                disabled={loading || added}
                variant="outline"
                className="flex-1 rounded-xl h-10 font-medium transition-all border-emerald-200 text-emerald-800 hover:bg-emerald-50/50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : added ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {added ? "Confirmed ✓" : "Add to Checklist"}
              </Button>
              <Button
                onClick={handleAddGroceryPlanToCart}
                disabled={groceriesAdded}
                className="flex-1 rounded-xl h-10 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 transition-all hover-elevate"
              >
                <ShoppingCart className="h-4 w-4" />
                {groceriesAdded ? "All Added ✓" : `Order All (₹${parsed.groceryPlan.length * 49})`}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main Chat Page ────────────────────────────────────────────────────────────

export default function Chat() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) {
        setConversations([]);
        return;
      }

      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", sbUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Chat] Conversations fetch error (non-critical):", error.message);
        setConversations([]);
        return;
      }

      setConversations(data || []);
    } catch (e) {
      console.warn("[Chat] loadConversations failed (non-critical):", e);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      if (convId.startsWith("c-")) {
        // Load messages from mock chats
        const mockMatch = MOCK_PREVIOUS_CHATS.find(c => c.id === convId);
        setMessages(mockMatch ? mockMatch.messages.map((m, i) => ({ id: `${convId}-${i}`, role: m.role, content: m.content })) : []);
        setLoadingMessages(false);
        return;
      }

      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[Chat] Messages fetch error (non-critical):", error.message);
        setMessages([]);
        return;
      }

      setMessages(data || []);
    } catch (e) {
      console.warn("[Chat] loadMessages failed (non-critical):", e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

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
  }, [messages, streamingContent]);

  const handleCreate = async () => {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          title: "New Conversation",
          user_id: sbUser.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversations(old => [data, ...old]);
      setActiveId(data.id);
    } catch (e) {
      console.error("Failed to create conversation in Supabase:", e);
      toast({ title: "Failed to create conversation", variant: "destructive" });
    }
  };

  // Click handler for prompt chips
  const handleQuickPrompt = async (promptText: string) => {
    if (isStreaming) return;
    let targetConvId = activeId;
    
    // Create new conversation if none is active
    if (!targetConvId) {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!sbUser) return;
        const { data, error } = await supabase
          .from("ai_conversations")
          .insert({
            title: promptText.length > 25 ? promptText.slice(0, 25) + "..." : promptText,
            user_id: sbUser.id
          })
          .select()
          .single();

        if (error) throw error;
        setConversations(old => [data, ...old]);
        targetConvId = data.id;
        setActiveId(data.id);
      } catch (e) {
        console.error(e);
        return;
      }
    }

    setInput(promptText);
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId || isStreaming) return;

    const userMessage = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const optimisticUserMsg = {
      id: Math.random().toString(),
      role: "user",
      content: userMessage,
      conversation_id: activeId
    };

    try {
      setMessages(old => [...(old || []), optimisticUserMsg]);

      // If active conversation is a mock, convert it to a database conversation first
      let currentConvId = activeId;
      if (activeId.startsWith("c-")) {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!sbUser) return;
        
        const { data, error } = await supabase
          .from("ai_conversations")
          .insert({
            title: userMessage.length > 25 ? userMessage.slice(0, 25) + "..." : userMessage,
            user_id: sbUser.id
          })
          .select()
          .single();

        if (error) throw error;
        setConversations(old => [data, ...old.filter(c => c.id !== activeId)]);
        currentConvId = data.id;
        setActiveId(data.id);
      }

      const { data: userMsg, error: userErr } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: currentConvId,
          role: "user",
          content: userMessage
        })
        .select()
        .single();

      if (userErr) throw userErr;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const chatHistoryContext = messages.slice(-10).map((m: any) => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`/api/openai/conversations/1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: userMessage,
          history: chatHistoryContext
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      let wasFallback = false;
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.trim());
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              streamDone = true;
              if (data.fallback) wasFallback = true;
              break;
            }
            if (data.error) {
              console.error("[Chat] Stream error:", data.error);
              streamDone = true;
              break;
            }
            if (data.content) {
              if (data.fallback) wasFallback = true;
              assistantMsg += data.content;
              setStreamingContent(assistantMsg);
            }
          } catch {
            // skip malformed line
          }
        }
      }

      setIsFallback(wasFallback);

      const { data: assistantMsgRow, error: assistantErr } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: currentConvId,
          role: "assistant",
          content: assistantMsg
        })
        .select()
        .single();

      if (assistantErr) throw assistantErr;

      setMessages(old => [
        ...(old || []).filter((m: any) => m.id !== optimisticUserMsg.id),
        userMsg,
        assistantMsgRow
      ]);

      if (wasFallback) {
        toast({
          title: "Demo mode active",
          description: "Gemini API quota reached. Showing smart example responses.",
        });
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
      setMessages(old => (old || []).filter((m: any) => m.id !== optimisticUserMsg.id));
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const addGroceries = async (items: GroceryItem[]) => {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      const weekOf = new Date().toISOString().split("T")[0];
      const { data: newPlan, error: planErr } = await supabase
        .from("grocery_plans")
        .insert({
          user_id: sbUser.id,
          week_of: weekOf,
        })
        .select()
        .single();

      if (planErr) throw planErr;

      const itemsToInsert = items.map((item: any) => ({
        plan_id: newPlan.id,
        name: item.name,
        category: item.category || "Pantry",
        quantity: item.quantity || "1",
        unit: item.unit || "unit",
        is_checked: false,
        nutrition_note: item.nutritionNote || null,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase
          .from("grocery_plan_items")
          .insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }

      toast({ title: "✅ Items added to your grocery list!" });
    } catch (e: any) {
      console.error("Failed to add groceries from chat:", e);
      toast({ title: "Failed to add items", description: e.message, variant: "destructive" });
    }
  };

  // Render combined DB and mock conversations in sidebar
  const combinedConversations = conversations && conversations.length > 0
    ? [...conversations, ...MOCK_PREVIOUS_CHATS.filter(mc => !conversations.some(c => c.title === mc.title))]
    : MOCK_PREVIOUS_CHATS;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Sidebar */}
        <div className="w-64 border-r hidden md:flex flex-col bg-muted/10">
          <div className="p-3 border-b">
            <Button onClick={handleCreate} className="w-full justify-start gap-2 h-9 font-semibold" variant="outline">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            {loadingConversations ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading chats...
              </div>
            ) : (
              combinedConversations?.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "p-3 mb-1 rounded-lg cursor-pointer flex items-center gap-2 text-sm transition-all duration-200",
                    activeId === c.id
                      ? "bg-primary/10 text-primary font-bold shadow-2xs"
                      : "hover:bg-muted text-foreground/75"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate text-left">{c.title}</span>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
            {loadingMessages && activeId ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" /> Loading messages...
              </div>
            ) : !messages?.length && !isStreaming ? (
              <div className="h-full max-w-xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shadow-inner relative">
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
                  <Sparkles className="h-7 w-7 text-primary animate-bounce duration-1000" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                    Ask your AI Wellness Co-Pilot
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Plan healthy diets, generate smart Instamart shopping lists, or fetch macro-balanced meals near you.
                  </p>
                </div>

                {/* Quick Start prompts chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-4">
                  {[
                    { text: "Order a high protein dinner under ₹300", desc: "Keto salads, gym dinners" },
                    { text: "Suggest groceries for a diabetic diet", desc: "Instamart list with low glycemic items" },
                    { text: "Plan meals for muscle gain", desc: "7-day customized protein budgets" },
                    { text: "Find healthy breakfast options nearby", desc: "Oats, millet idlis, avo toast" }
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(p.text)}
                      className="p-3.5 text-left rounded-xl border border-border/60 hover:border-primary/50 bg-card hover:bg-primary/[0.01] transition-all hover:scale-101 text-xs shadow-2xs"
                    >
                      <p className="font-bold text-foreground">{p.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm font-semibold leading-relaxed shadow-sm text-left">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[85%] w-full bg-muted rounded-2xl rounded-tl-sm px-4 py-3 border border-border/30">
                      <AIMessageBubble content={msg.content} onAddGroceries={addGroceries} />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Streaming bubble */}
            {isStreaming && (
              <div className="flex w-full justify-start animate-pulse">
                <div className="max-w-[85%] w-full bg-muted rounded-2xl rounded-tl-sm px-4 py-3 border border-border/30">
                  {streamingContent ? (
                    <AIMessageBubble content={streamingContent} onAddGroceries={addGroceries} />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}
                  <span className="inline-block h-4 w-0.5 ml-0.5 bg-emerald-500 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Input Panel */}
          <div className="p-4 border-t bg-background">
            <form id="chat-form" onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeId ? "Ask about nutrition, meals, grocery planning..." : "Choose a chat or click a prompt above to start..."}
                className="pr-12 py-6 rounded-full shadow-inner text-sm"
                disabled={!activeId || isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-105"
                disabled={!input.trim() || !activeId || isStreaming}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
