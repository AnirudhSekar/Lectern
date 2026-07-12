import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDriveFileId, fetchDriveFileMetadata, downloadDriveFile } from "@/lib/inngest/googleDrive";
import { extractAudioServerSide } from "@/lib/audio/extractServerSide";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs"; // needs fs/child-process access — not Edge-compatible

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "A Google Drive link is required" }, { status: 400 });
  }

  const fileId = extractDriveFileId(url);
  if (!fileId) {
    return NextResponse.json({ error: "Couldn't parse a file ID from that link" }, { status: 400 });
  }

  try {
    const metadata = await fetchDriveFileMetadata(fileId);
    const isAudio = metadata.mimeType.startsWith("audio/");
    const isMp4 = metadata.mimeType === "video/mp4";

    if (!isAudio && !isMp4) {
      return NextResponse.json(
        { error: "Only audio files or MP4 videos are supported from Drive right now." },
        { status: 400 }
      );
    }

    if (metadata.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is larger than the 200MB limit." }, { status: 400 });
    }

    const fileBuffer = await downloadDriveFile(fileId);

    // Always run extraction — even for audio input — to normalize to
    // the same mono/16kHz/32kbps profile as every other upload path.
    const audioBuffer = await extractAudioServerSide(
      fileBuffer,
      isMp4 ? "mp4" : metadata.name.split(".").pop() || "audio"
    );

    const lectureId = crypto.randomUUID();
    const storagePath = `${user.id}/${lectureId}.mp3`;

    // Uses the regular authenticated client (not admin/service-role) —
    // same RLS-scoped security model as every client-side upload.
    // Storage RLS already scopes to {user_id}/ folders, and the
    // lectures INSERT policy already requires user_id = auth.uid().
    const { error: uploadError } = await supabase.storage
      .from("lecture-audio")
      .upload(storagePath, audioBuffer, { contentType: "audio/mpeg", upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("lectures").insert({
      id: lectureId,
      user_id: user.id,
      title: metadata.name.replace(/\.[^.]+$/, ""),
      audio_storage_path: storagePath,
      status: "queued",
    });

    if (insertError) {
      return NextResponse.json({ error: `Failed to create lecture: ${insertError.message}` }, { status: 500 });
    }

    await inngest.send({ name: "lecture/created", data: { lectureId } });

    return NextResponse.json({ lectureId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process Drive link" },
      { status: 500 }
    );
  }
}