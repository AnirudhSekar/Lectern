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
  const jobId = randomUUID();
  const inputPath = join(tmpdir(), `${jobId}-in.${inputExt}`);
  const outputPath = join(tmpdir(), `${jobId}-out.mp3`);

  await writeFile(inputPath, inputBuffer);

  try {
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

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}