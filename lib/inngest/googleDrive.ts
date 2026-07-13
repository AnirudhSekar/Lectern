const DRIVE_URL_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
  /docs\.google\.com\/.*\/d\/([a-zA-Z0-9_-]+)/,
];

export function extractDriveFileId(url: string): string | null {
  for (const pattern of DRIVE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/.test(url);
}

interface DriveMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

class DriveImportError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "NOT_SHARED" | "TOO_LARGE" | "UNSUPPORTED_TYPE" | "UNKNOWN") {
    super(message);
    this.name = "DriveImportError";
  }
}

const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["audio/", "video/mp4"];

export async function fetchDriveMetadata(fileId: string, accessToken: string): Promise<DriveMetadata> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (res.status === 404) throw new DriveImportError("File not found on Drive.", "NOT_FOUND");
  if (res.status === 403) {
    throw new DriveImportError("You don't have access to this file.", "NOT_SHARED");
  }
  if (!res.ok) throw new DriveImportError(`Drive API error (${res.status}).`, "UNKNOWN");

  const meta = (await res.json()) as DriveMetadata;

  const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) => meta.mimeType.startsWith(prefix));
  if (!isAllowedType) {
    throw new DriveImportError(
      `Unsupported file type: ${meta.mimeType}. Only audio and MP4 files are supported.`,
      "UNSUPPORTED_TYPE"
    );
  }

  if (Number(meta.size) > MAX_BYTES) throw new DriveImportError("File exceeds 200MB limit.", "TOO_LARGE");

  return meta;
}

export async function downloadDriveFile(
  fileId: string,
  metadata: DriveMetadata,
  accessToken: string
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!res.ok) throw new DriveImportError(`Failed to download file from Drive (${res.status}).`, "UNKNOWN");

  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: metadata.mimeType,
    filename: metadata.name,
  };
}

export { DriveImportError };