import { createAdminClient } from "@/lib/supabase/admin";

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const OUTPUT_DIMENSIONS = 768;
const CHUNK_SIZE_CHARS = 1200; // smaller than TASK-3.2's 6000 — these chunks are meant to be individually retrievable passages, not just a way to fit within an API limit
const CHUNK_OVERLAP_CHARS = 150;

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

interface TextChunk {
  content: string;
  startChar: number;
  endChar: number;
}

function chunkTextWithOffsets(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
    chunks.push({ content: text.slice(start, end), startChar: start, endChar: end });
    if (end === text.length) break;
    start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}

function normalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return magnitude === 0 ? vec : vec.map((v) => v / magnitude);
}

async function embedChunk(text: string, taskType: TaskType): Promise<number[]> {
  const response = await fetch(`${GEMINI_EMBED_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: OUTPUT_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini embedding request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== OUTPUT_DIMENSIONS) {
    throw new Error("Gemini embedding response missing or malformed `embedding.values`");
  }

  return normalize(values);
}

/**
 * TASK-3.3 (revised) — Chunks a transcript into overlapping passages,
 * embeds each individually (RETRIEVAL_DOCUMENT), and stores them with
 * character offsets. Replaces the single-averaged-vector approach —
 * that made "which lecture matches" possible but not "where in it."
 */
export async function embedAndStoreTranscriptChunks(lectureId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: transcript, error: fetchError } = await supabase
    .from("transcripts")
    .select("id, full_text")
    .eq("lecture_id", lectureId)
    .single();

  if (fetchError || !transcript || !transcript.full_text) {
    throw new Error(`Could not find transcript for lecture ${lectureId}: ${fetchError?.message}`);
  }

  const chunks = chunkTextWithOffsets(transcript.full_text);

  const rows = await Promise.all(
    chunks.map(async (chunk, i) => ({
      transcript_id: transcript.id,
      lecture_id: lectureId,
      chunk_index: i,
      content: chunk.content,
      start_char: chunk.startChar,
      end_char: chunk.endChar,
      embedding: await embedChunk(chunk.content, "RETRIEVAL_DOCUMENT"),
    }))
  );

  const { error: insertError } = await supabase.from("transcript_chunks").insert(rows);

  if (insertError) {
    throw new Error(`Failed to store transcript chunks for lecture ${lectureId}: ${insertError.message}`);
  }
}

export async function embedSearchQuery(query: string): Promise<number[]> {
  if (!query || query.trim().length === 0) {
    throw new Error("Cannot embed an empty search query");
  }
  return embedChunk(query, "RETRIEVAL_QUERY");
}