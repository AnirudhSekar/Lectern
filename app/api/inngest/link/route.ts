import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import {
  extractDriveFileId,
  isGoogleDriveUrl,
  fetchDriveMetadata,
  downloadDriveFile,
  DriveImportError,
} from "@/lib/inngest/googleDrive";
import {
  isDropboxUrl,
  normalizeDropboxUrl,
  probeDirectLink,
  downloadDirectLink,
  DirectLinkError,
} from "@/lib/inngest/directLink";
import { extractAudioServerSide } from "@/lib/audio/extractServerSide";
import { getValidGoogleAccessToken } from "@/lib/google/refreshToken";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'url'." }, { status: 400 });
  }

  let file: { buffer: Buffer; mimeType: string; filename: string };

  try {
    if (isGoogleDriveUrl(url)) {
      const fileId = extractDriveFileId(url);
      if (!fileId) {
        return NextResponse.json(
          { error: "Couldn't parse a file ID from that Google Drive link." },
          { status: 400 }
        );
      }
      const accessToken = await getValidGoogleAccessToken(user.id);
      const metadata = await fetchDriveMetadata(fileId, accessToken);
      file = await downloadDriveFile(fileId, metadata, accessToken);
    } else {
      const targetUrl = isDropboxUrl(url) ? normalizeDropboxUrl(url) : url;
      const probe = await probeDirectLink(targetUrl);
      file = await downloadDirectLink(targetUrl, probe.mimeType);
    }
  } catch (err) {
    if (err instanceof DriveImportError || err instanceof DirectLinkError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Link import failed:", err);
    return NextResponse.json({ error: "Import failed. Please check the link and try again." }, { status: 500 });
  }

const inputExt = file.filename.split(".").pop() || (file.mimeType.startsWith("video/") ? "mp4" : "mp3");
const audioBuffer = await extractAudioServerSide(file.buffer, inputExt);
const storageExt = "mp3";
  const lectureId = crypto.randomUUID();
  const storagePath = `${user.id}/${lectureId}.${storageExt}`;

  const { error: uploadError } = await supabase.storage
    .from("lecture-audio")
    .upload(storagePath, audioBuffer, {
      contentType: file.mimeType.startsWith("video/") ? "audio/mpeg" : file.mimeType,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return NextResponse.json({ error: "Failed to save imported file." }, { status: 500 });
  }

  const title = file.filename.replace(/\.[^/.]+$/, "") || "Imported lecture";

  const { data: lecture, error: insertError } = await supabase
    .from("lectures")
    .insert({
      id: lectureId,
      user_id: user.id,
      title,
      audio_storage_path: storagePath,
      status: "queued",
    })
    .select()
    .single();

  if (insertError || !lecture) {
    console.error("Lecture row insert failed:", insertError, "lecture:", lecture);
    return NextResponse.json({ error: "Failed to create lecture record." }, { status: 500 });
  }

  await inngest.send({
    name: "lecture/created",
    data: { lectureId: lecture.id },
    id: lecture.id,
  });

  return NextResponse.json({ lecture }, { status: 201 });
}