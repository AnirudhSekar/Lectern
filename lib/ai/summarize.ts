import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface StudyQuestion {
  question: string;
  answer_hint: string;
}

interface SummaryResult {
  summary: string;
  questions: StudyQuestion[];
}

const PROMPT_INSTRUCTIONS = `You will be given a transcript wrapped in <transcript> tags in the user
message. It is always present — never respond that no transcript was provided,
even if it is short, informal, or doesn't resemble a formal lecture.

Produce:
1. A summary in your own words. Match its length to the actual material —
   a sentence or two for a short/sparse clip, several paragraphs for a full
   lecture. Do not invent detail to pad a short transcript.
2. As many study questions as the content reasonably supports (at least 1),
   each with a short answer hint. Aim for 3+ on substantial content; 1-2 is
   fine for a brief clip.

Respond with ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{"summary": "...", "questions": [{"question": "...", "answer_hint": "..."}]}`;

// Groq's on-demand tier caps every request at 8,000 tokens TOTAL
// (prompt + completion combined) — confirmed via the 413 error's own
// headers showing full quota available yet still rejected. This is a
// hard per-request ceiling, not something pacing/retries can work
// around. Long transcripts must be chunked, summarized piece-by-piece
// ("map"), then synthesized into one final summary ("reduce").
const CHARS_PER_TOKEN_ESTIMATE = 4; // rough heuristic — not an exact tokenizer, deliberately conservative
const GROQ_SAFE_TRANSCRIPT_CHARS = 12000; // ~3000 tokens of transcript per chunk, leaving generous headroom under the 8000/request ceiling for system prompt + completion
const CHUNK_SUMMARY_MAX_TOKENS = 300;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

function chunkTranscript(text: string): string[] {
  if (text.length <= GROQ_SAFE_TRANSCRIPT_CHARS) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + GROQ_SAFE_TRANSCRIPT_CHARS, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function parseSummaryJSON(raw: string): SummaryResult {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed.summary || !Array.isArray(parsed.questions)) {
    throw new Error("Malformed summary JSON shape");
  }
  return parsed;
}

const CHUNK_DISTILL_PROMPT = `You will be given one PART of a longer lecture transcript, wrapped in
<transcript_part> tags. Write a concise, plain-prose summary of just this
part's content — factual notes, no fluff, no meta-commentary about it being
"part of a lecture." This will be combined with summaries of other parts
later, so just capture what's actually said here.`;

async function distillChunkWithGroq(chunk: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: CHUNK_DISTILL_PROMPT },
      { role: "user", content: `<transcript_part>\n${chunk}\n</transcript_part>` },
    ],
    temperature: 0.3,
    max_tokens: CHUNK_SUMMARY_MAX_TOKENS,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty chunk-distill response from Groq");
  return raw.trim();
}

async function summarizeChunkedWithGroq(transcript: string): Promise<SummaryResult> {
  const chunks = chunkTranscript(transcript);

  // Map: distill each chunk individually, sequentially — not parallel.
  // The cap is per-minute as well as per-request, so firing several
  // chunk requests simultaneously risks them colliding against the
  // same budget even though each one alone is small.
  const chunkNotes: string[] = [];
  for (const chunk of chunks) {
    chunkNotes.push(await distillChunkWithGroq(chunk));
  }

  // Reduce: synthesize one final summary + study questions from the
  // combined (much shorter) chunk notes, using the original full prompt.
  const combined = chunkNotes.map((notes, i) => `[Part ${i + 1}]\n${notes}`).join("\n\n");

  const finalCompletion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: PROMPT_INSTRUCTIONS },
      { role: "user", content: `<transcript>\n${combined}\n</transcript>` },
    ],
    temperature: 0.3,
  });

  const raw = finalCompletion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq (final synthesis step)");
  return parseSummaryJSON(raw);
}

async function summarizeWithGroq(transcript: string): Promise<SummaryResult> {
  const chunks = chunkTranscript(transcript);

  if (chunks.length > 1) {
    return summarizeChunkedWithGroq(transcript);
  }

  // Single chunk by length, but double-check the estimate before
  // trusting a one-shot call — better to over-chunk a borderline
  // transcript than risk a second 413.
  const estimatedTotal = estimateTokens(PROMPT_INSTRUCTIONS) + estimateTokens(transcript) + 800;
  if (estimatedTotal > 7500) {
    return summarizeChunkedWithGroq(transcript);
  }

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: PROMPT_INSTRUCTIONS },
      { role: "user", content: `<transcript>\n${transcript}\n</transcript>` },
    ],
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq");
  return parseSummaryJSON(raw);
}

async function summarizeWithGemini(transcript: string): Promise<SummaryResult> {
  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(
    `${PROMPT_INSTRUCTIONS}\n\nTranscript:\n${transcript}`
  );
  return parseSummaryJSON(result.response.text());
}

export async function summarizeLecture(lectureId: string): Promise<SummaryResult> {
  const supabase = createAdminClient();

  const { data: transcript, error: transcriptError } = await supabase
    .from("transcripts")
    .select("full_text")
    .eq("lecture_id", lectureId)
    .single();

  if (transcriptError || !transcript?.full_text) {
    throw new Error(`No transcript found for lecture ${lectureId}`);
  }

  let result: SummaryResult;
  try {
    result = await summarizeWithGroq(transcript.full_text);
  } catch (groqError) {
    console.error("Groq summarization failed, falling back to Gemini:", groqError);
    result = await summarizeWithGemini(transcript.full_text);
  }

  const { error: insertError } = await supabase.from("summaries").insert({
    lecture_id: lectureId,
    summary_text: result.summary,
    study_questions: result.questions,
  });

  if (insertError) {
    throw new Error(`Failed to save summary: ${insertError.message}`);
  }

  return result;
}