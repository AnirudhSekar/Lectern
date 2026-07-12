import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedSearchQuery } from "@/lib/ai/embed";

export const runtime = "nodejs"; // supabase-js needs Node APIs, not Edge

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: lectureId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { question } = await request.json();
  if (!question || typeof question !== "string" || !question.trim()) {
    return new Response("Question is required", { status: 400 });
  }

  const { data: lecture, error: lectureError } = await supabase
    .from("lectures")
    .select("id, title, status")
    .eq("id", lectureId)
    .single();

  if (lectureError || !lecture) {
    return new Response("Lecture not found", { status: 404 });
  }

  if (lecture.status !== "done") {
    return new Response("This lecture hasn't finished processing yet", { status: 409 });
  }

  const queryEmbedding = await embedSearchQuery(question);

  const { data: chunks, error: chunkError } = await supabase.rpc("match_lecture_chunks", {
    query_embedding: queryEmbedding,
    target_lecture_id: lectureId,
    match_count: 6,
  });

  if (chunkError) {
    return new Response(`Retrieval failed: ${chunkError.message}`, { status: 500 });
  }

  if (!chunks || chunks.length === 0) {
    return new Response(
      "I don't have transcript content indexed for this lecture yet.",
      { status: 200, headers: { "Content-Type": "text/plain" } }
    );
  }

  const context = chunks
    .map((c: { content: string }, i: number) => `[Passage ${i + 1}]\n${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are a study assistant helping a student understand a specific lecture titled "${lecture.title}". Answer the student's question using ONLY the lecture passages provided below. If the passages don't contain enough information to answer, say so clearly rather than guessing or using outside knowledge. Keep answers concise and directly grounded in what's actually said in these passages.

LECTURE PASSAGES:
${context}`;

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    }),
  });

  if (!groqResponse.ok || !groqResponse.body) {
    const errorText = await groqResponse.text();
    return new Response(`Groq request failed: ${errorText}`, { status: 502 });
  }

  // Groq's response is SSE-formatted (OpenAI-compatible). Parse it and
  // re-emit just the text deltas as a plain stream — simpler for the
  // client than re-parsing SSE itself.
  const reader = groqResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // ignore malformed/keep-alive lines
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}