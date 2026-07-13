import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function extractAudioServerSide(
  inputBuffer: Buffer,
  inputExt: string
): Promise<Buffer> {
  const workerUrl = process.env.FFMPEG_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;

  if (!workerUrl || !workerSecret) {
    throw new Error("FFMPEG_WORKER_URL or WORKER_SECRET not configured");
  }

  const res = await fetch(`${workerUrl}/extract?ext=${inputExt}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/octet-stream",
    "x-worker-secret": workerSecret,
  },
  body: new Uint8Array(inputBuffer),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ffmpeg worker failed (${res.status}): ${body}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}