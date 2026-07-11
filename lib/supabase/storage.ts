import { createClient } from "@/lib/supabase/client";
import * as tus from "tus-js-client";

const BUCKET = "lecture-audio";
const MAX_BYTES = 200 * 1024 * 1024; // 200MB
const ALLOWED_TYPE_PREFIX = "audio/";
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024; // Supabase's own cutoff: standard upload is unreliable above this

export function validateAudioFile(file: File): string | null {
  if (!file.type.startsWith(ALLOWED_TYPE_PREFIX)) {
    return "Only audio files are allowed.";
  }
  if (file.size > MAX_BYTES) {
    return "File is larger than the 200MB limit.";
  }
  return null;
}

export async function uploadLectureAudio(
  userId: string,
  lectureId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const path = `${userId}/${lectureId}.${file.name.split(".").pop()}`;
  const supabase = createClient();

  if (file.size <= RESUMABLE_THRESHOLD) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    onProgress?.(100);
    return path;
  }

  // Large file: use TUS resumable upload — the standard method stalls
  // unpredictably above ~6MB on real-world connections.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // must be fixed at 6MB for Supabase's TUS implementation
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: () => resolve(path),
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    });
  });
}