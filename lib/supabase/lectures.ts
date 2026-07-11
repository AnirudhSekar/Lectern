import { createClient } from "@/lib/supabase/client";

export async function createLectureRow(userId: string, lectureId: string, title: string) {
  const supabase = createClient();
  const { error } = await supabase.from("lectures").insert({
    id: lectureId,
    user_id: userId,
    title,
    status: "queued",
  });
  if (error) throw error;
}

export async function attachAudioPath(lectureId: string, path: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("lectures")
    .update({ audio_storage_path: path })
    .eq("id", lectureId);
  if (error) throw error;
}