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
export async function softDeleteLectures(lectureIds: string[]) {
  const supabase = createClient();
  const { error } = await supabase
    .from('lectures')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', lectureIds);

  if (error) throw new Error(`Failed to move to trash: ${error.message}`);
}

export async function restoreLectures(lectureIds: string[]) {
  const supabase = createClient();
  const { error } = await supabase
    .from('lectures')
    .update({ deleted_at: null })
    .in('id', lectureIds);

  if (error) throw new Error(`Failed to restore: ${error.message}`);
}

// The real, permanent delete — only ever called from the trash view.
export async function permanentlyDeleteLecture(lectureId: string, audioStoragePath: string | null) {
  const supabase = createClient();

  if (audioStoragePath) {
    const { error: storageError } = await supabase.storage
      .from('lecture-audio')
      .remove([audioStoragePath]);
    if (storageError) throw new Error(`Failed to delete audio file: ${storageError.message}`);
  }

  const { error: dbError } = await supabase.from('lectures').delete().eq('id', lectureId);
  if (dbError) throw new Error(`Failed to delete lecture record: ${dbError.message}`);
}