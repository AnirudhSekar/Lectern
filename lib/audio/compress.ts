import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const CORE_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd`;
let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    workerURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.worker.js`, "text/javascript"),
  });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Downsamples to mono, 16kHz, 32kbps — plenty for speech transcription,
 * far smaller than typical source recordings. Runs entirely in-browser.
 */
export async function compressAudioForUpload(
  file: File,
  onProgress?: (percent: number) => void
): Promise<File> {
  const ffmpeg = await getFFmpeg();

  const handleProgress = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(100, Math.round(progress * 100)));
  };
  ffmpeg.on("progress", handleProgress);

  const inputName = `input.${file.name.split(".").pop() || "audio"}`;
  const outputName = "output.mp3";

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec(["-i", inputName, "-ac", "1", "-ar", "16000", "-b:a", "32k", outputName]);

    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : Uint8Array.from(data);
    const blob = new Blob([bytes], { type: "audio/mpeg" });

    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".mp3"), {
      type: "audio/mpeg",
    });

    return compressed.size < file.size ? compressed : file;  } finally {
    ffmpeg.off("progress", handleProgress);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}