import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  GenerateOpenaiImageBody,
  GenerateOpenaiImageResponse,
} from "@workspace/api-zod";
import { eq, asc, and } from "drizzle-orm";
import { getGeminiModel, getFallbackResponse } from "../lib/gemini";

import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

const NUTRIFLOW_SYSTEM_PROMPT = `You are NutriFlow AI — a warm, knowledgeable AI wellness copilot. You help users with:
- Healthy meal recommendations and nutrition guidance
- Personalized meal plans based on goals (muscle gain, weight loss, diabetes management, etc.)
- Grocery list planning and healthy food shopping
- Understanding nutrition labels, calories, macros, and micronutrients
- Healthy restaurant choices and meal customization

Tone: Warm, encouraging, practical. Like a knowledgeable friend who is a nutritionist.

Response Format:
You MUST respond in valid JSON format.
Your JSON response must contain the following keys:
1. "text" (string, required): Your conversational response to the user. This is what the user sees first. Use warm, friendly language.
2. "recommendation" (object, optional): If the user asks for a meal recommendation, a suggestion, or a recipe, include this object with:
   - "mealTitle" (string)
   - "calories" (number)
   - "protein" (number)
   - "cuisine" (string)
   - "healthScore" (number)
   - "groceryItems" (array of strings)
   - "reason" (string, explanation of why this fits their profile)
3. "wellnessInsight" (string, optional): A short (1 sentence) wellness insight, tip, or encouraging message.
4. "groceryPlan" (array of objects, optional): If the user requests a grocery list or meal prep grocery plan, return a list of items:
   - "name" (string)
   - "category" (string, e.g. Vegetables, Fruits, Proteins, Grains, Dairy, Pantry, Snacks, Beverages)
   - "quantity" (string)
   - "unit" (string)
   - "nutritionNote" (string)

Always remind users to consult a healthcare professional for medical nutrition therapy in the "text" field if relevant.
Do not wrap your response in markdown code blocks. Output raw JSON only.`;

function getPlainTextContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      let text = parsed.text || "";
      if (parsed.recommendation) {
        text += `\n[Recommendation: ${parsed.recommendation.mealTitle} - ${parsed.recommendation.calories} kcal, ${parsed.recommendation.protein}g protein]`;
      }
      return text;
    }
  } catch {
    // Not JSON
  }
  return content;
}


router.get("/openai/conversations", requireAuth, async (req, res): Promise<void> => {
  const convs = await db.select().from(conversations).where(eq(conversations.userId, req.user!.id));
  res.json(convs);
});

router.post("/openai/conversations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db.insert(conversations).values({ title: parsed.data.title, userId: req.user!.id }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
  );
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));

  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
  );
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(messages).where(eq(messages.conversationId, params.data.id));
  await db.delete(conversations).where(eq(conversations.id, params.data.id));
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(
    and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
  );
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(asc(messages.createdAt));

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userContent = body.data.content;
  const hasHistoryInBody = req.body.history && Array.isArray(req.body.history);

  let contents = [];

  if (hasHistoryInBody) {
    console.log(`[Chat] Using client-provided chat history context (${req.body.history.length} messages)`);
    contents = req.body.history.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" as const : "user" as const,
      parts: [{ text: m.role === "assistant" || m.role === "model" ? getPlainTextContent(m.content) : m.content }]
    }));
    
    // Add current user message
    contents.push({
      role: "user" as const,
      parts: [{ text: userContent }]
    });
  } else {
    // Legacy path: check conversation and load history from database
    const [conv] = await db.select().from(conversations).where(
      and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id))
    );
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    console.log(`[Chat] User message in conv ${params.data.id}: "${userContent.slice(0, 80)}..."`);

    // Save user message first
    await db.insert(messages).values({
      conversationId: params.data.id,
      role: "user",
      content: userContent,
    });

    // Load conversation history (last 20 messages)
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    contents = history.map(m => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.role === "assistant" ? getPlainTextContent(m.content) : m.content }]
    }));
  }

  // Set SSE headers BEFORE any streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";
  let usedFallback = false;

  try {
    console.log(`[Chat] Calling Gemini API (gemini-2.0-flash-lite)...`);
    const model = getGeminiModel(NUTRIFLOW_SYSTEM_PROMPT, false);
    const resultStream = await model.generateContentStream({ contents });

    for await (const chunk of resultStream.stream) {
      const content = chunk.text();
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    console.log(`[Chat] Gemini responded successfully (${fullResponse.length} chars)`);

  } catch (geminiError: any) {
    const isRateLimit = geminiError?.status === 429 || geminiError?.message?.includes("429") || geminiError?.message?.includes("quota");
    const isNotFound = geminiError?.status === 404;

    console.error(`[Chat] Gemini error (${geminiError?.status || "unknown"}):`, geminiError?.message || geminiError);

    if (isRateLimit) {
      console.warn("[Chat] Rate limit hit — using intelligent fallback response");
    } else if (isNotFound) {
      console.warn("[Chat] Model not found — using fallback response");
    } else {
      console.error("[Chat] Unexpected Gemini error — using fallback response");
    }

    // Use intelligent fallback — stream it in chunks like a real response
    usedFallback = true;
    fullResponse = getFallbackResponse(userContent);

    // Stream fallback in small chunks to simulate real streaming UX
    const chunkSize = 30;
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      const content = fullResponse.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ content, fallback: true })}\n\n`);
      await new Promise(r => setTimeout(r, 20)); // small delay for streaming feel
    }
  }

  // Save assistant message to DB
  try {
    if (!hasHistoryInBody) {
      await db.insert(messages).values({
        conversationId: params.data.id,
        role: "assistant",
        content: fullResponse,
      });
      console.log(`[Chat] Saved assistant message to DB (fallback=${usedFallback})`);
    }
  } catch (dbError) {
    console.error("[Chat] Failed to save assistant message to DB:", dbError);
  }

  res.write(`data: ${JSON.stringify({ done: true, fallback: usedFallback })}\n\n`);
  res.end();
});


router.post("/openai/generate-image", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateOpenaiImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Return a mock green leaf theme SVG image base64, satisfying schema but fully local.
  const dummySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#ECFDF5" />
      <path d="M50 20 C20 40 20 80 50 80 C80 80 80 40 50 20 Z" fill="url(#g)" />
      <path d="M50 20 L50 80" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      <text x="50" y="90" font-family="sans-serif" font-size="6" fill="#065F46" text-anchor="middle" font-weight="bold">NutriFlow AI Image</text>
    </svg>
  `;
  const base64 = Buffer.from(dummySvg.trim()).toString("base64");
  res.json(GenerateOpenaiImageResponse.parse({ b64_json: base64 }));
});

export default router;
