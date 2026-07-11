import Groq from "groq-sdk";
import { toFile } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const BUCKET = "lecture-audio";

async function transcribeWithGroq(fileBlob: Blob, fileName: string): Promise<string> {
  const audioFile = await toFile(Buffer.from(await fileBlob.arrayBuffer()), fileName);
  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3-turbo",
  });
  return transcription.text;
}

async function transcribeWithGemini(fileBlob: Blob): Promise<string> {
  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
  const base64Audio = Buffer.from(await fileBlob.arrayBuffer()).toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: fileBlob.type || "audio/mpeg",
        data: base64Audio,
      },
    },
    "Transcribe this audio verbatim. Output only the spoken words as plain text — no timestamps, no speaker labels, no commentary, no markdown.",
  ]);

  return result.response.text();
}

export async function transcribeLecture(lectureId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: lecture, error: lectureError } = await supabase
    .from("lectures")
    .select("audio_storage_path")
    .eq("id", lectureId)
    .single();

  if (lectureError || !lecture?.audio_storage_path) {
    throw new Error(`No audio path found for lecture ${lectureId}`);
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(lecture.audio_storage_path);

  if (downloadError || !fileBlob) {
    throw new Error(`Failed to download audio: ${downloadError?.message}`);
  }

  const fileName = lecture.audio_storage_path.split("/").pop()!;

  let fullText: string;
  try {
    fullText = await transcribeWithGroq(fileBlob, fileName);
  } catch (groqError) {
    console.error("Groq STT failed, falling back to Gemini:", groqError);
    fullText = await transcribeWithGemini(fileBlob);
  }

  const { error: insertError } = await supabase.from("transcripts").insert({
    lecture_id: lectureId,
    full_text: fullText,
  });

  if (insertError) {
    throw new Error(`Failed to save transcript: ${insertError.message}`);
  }

  return fullText;
}