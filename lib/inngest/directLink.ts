const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["audio/", "video/mp4"];
const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "mp4"];

function hasAllowedExtension(url: string): boolean {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_EXTENSIONS.includes(ext);
}
export function isDropboxUrl(url: string): boolean {
  return /dropbox\.com/.test(url);
}

export function normalizeDropboxUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("dl", "1"); // dl=0 renders preview page, dl=1 forces raw file
  return u.toString();
}

class DirectLinkError extends Error {
  constructor(message: string, public code: "UNREACHABLE" | "TOO_LARGE" | "UNSUPPORTED_TYPE" | "UNKNOWN") {
    super(message);
    this.name = "DirectLinkError";
  }
}

interface ProbeResult {
  mimeType: string;
  sizeBytes: number | null;
}

export async function probeDirectLink(url: string): Promise<ProbeResult> {
  let res: Response;
  try {
    res = await fetch(url, { method: "HEAD" });
  } catch {
    throw new DirectLinkError("Could not reach that URL.", "UNREACHABLE");
  }

  if (!res.ok) {
    throw new DirectLinkError(`URL returned ${res.status}.`, "UNREACHABLE");
  }

  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const contentLength = res.headers.get("content-length");
  const sizeBytes = contentLength ? Number(contentLength) : null;

  const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
  const isAllowedExt = hasAllowedExtension(url);

  if (!isAllowedType && !isAllowedExt) {
    throw new DirectLinkError(
      `Unsupported file type: ${mimeType}. Only audio and MP4 files are supported.`,
      "UNSUPPORTED_TYPE"
    );
  }
  if (sizeBytes !== null && sizeBytes > MAX_BYTES) {
    throw new DirectLinkError("File exceeds 200MB limit.", "TOO_LARGE");
  }

  return { mimeType, sizeBytes };
}

export async function downloadDirectLink(
  url: string,
  probedMimeType: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new DirectLinkError(`Download failed (${res.status}).`, "UNKNOWN");
  }

  const arrayBuffer = await res.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_BYTES) {
    // Content-Length was missing/unreliable — real size only known now.
    throw new DirectLinkError("File exceeds 200MB limit.", "TOO_LARGE");
  }

  const filename = url.split("/").pop()?.split("?")[0] || "imported-file";

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: probedMimeType,
    filename,
  };
}

export { DirectLinkError };