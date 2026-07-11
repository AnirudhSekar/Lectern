import { createAdminClient } from "@/lib/supabase/admin";

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const OUTPUT_DIMENSIONS = 768;
const CHUNK_SIZE_CHARS = 6000; // conservative — well under the model's 8,192 *token* input limit, using chars as a safe proxy without needing a tokenizer dependency
const CHUNK_OVERLAP_CHARS = 500; // avoids losing meaning at chunk boundaries

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}

async function embedChunk(text: string): Promise<number[]> {
  const response = await fetch(`${GEMINI_EMBED_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
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

  return values;
}

function meanPool(vectors: number[][]): number[] {
  const dims = vectors[0].length;
  const summed = new Array(dims).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dims; i++) {
      summed[i] += vec[i];
    }
  }

  const averaged = summed.map((sum) => sum / vectors.length);

  const magnitude = Math.sqrt(averaged.reduce((sum, val) => sum + val * val, 0));
  return averaged.map((val) => val / magnitude);
}


export async function embedTranscript(fullText: string): Promise<number[]> {
  if (!fullText || fullText.trim().length === 0) {
    throw new Error("Cannot embed an empty transcript");
  }

  const chunks = chunkText(fullText);
  const chunkEmbeddings = await Promise.all(chunks.map(embedChunk));

  return chunks.length === 1 ? chunkEmbeddings[0] : meanPool(chunkEmbeddings);
}
export async function embedLectureTranscript(lectureId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: transcript, error: fetchError } = await supabase
    .from("transcripts")
    .select("id, full_text")
    .eq("lecture_id", lectureId)
    .single();

  if (fetchError || !transcript) {
    throw new Error(`Could not find transcript for lecture ${lectureId}: ${fetchError?.message}`);
  }

  const embedding = await embedTranscript(transcript.full_text);

  const { error: updateError } = await supabase
    .from("transcripts")
    .update({ embedding })
    .eq("id", transcript.id);

  if (updateError) {
    throw new Error(`Failed to save embedding for lecture ${lectureId}: ${updateError.message}`);
  }
}