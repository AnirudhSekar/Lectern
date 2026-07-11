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
function parseSummaryJSON(raw: string): SummaryResult {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed.summary || !Array.isArray(parsed.questions)) {
    throw new Error("Malformed summary JSON shape");
  }
  return parsed;
}

async function summarizeWithGroq(transcript: string): Promise<SummaryResult> {
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