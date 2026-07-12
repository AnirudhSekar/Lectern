import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Same normalization profile as the client-side ffmpeg.wasm path
 * (mono/16kHz/32kbps) — used here so audio pulled from a Drive link
 * ends up identical in shape to a native upload, regardless of source
 * format (audio or video).
 */
export async function extractAudioServerSide(inputBuffer: Buffer, inputExt: string): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `${id}-input.${inputExt}`);
  const outputPath = path.join(os.tmpdir(), `${id}-output.mp3`);

  await writeFile(inputPath, inputBuffer);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .audioBitrate("32k")
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  const outputBuffer = await readFile(outputPath);
  await unlink(inputPath).catch(() => {});
  await unlink(outputPath).catch(() => {});

  return outputBuffer;
}