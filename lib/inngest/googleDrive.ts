const DRIVE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/file/d/FILE_ID/view
  /[?&]id=([a-zA-Z0-9_-]+)/,      // https://drive.google.com/open?id=FILE_ID
];

export function extractDriveFileId(url: string): string | null {
  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface DriveFileMetadata {
  name: string;
  mimeType: string;
  size: number;
}

export async function fetchDriveFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Couldn't access this file. Make sure it's shared as "Anyone with the link can view."`
    );
  }

  const data = await res.json();
  return { name: data.name, mimeType: data.mimeType, size: Number(data.size ?? 0) };
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download the file from Drive (${res.status})`);
  }

  return Buffer.from(await res.arrayBuffer());
}