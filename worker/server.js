const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const { writeFile, unlink, readFile } = require("fs/promises");
const { tmpdir } = require("os");
const { join } = require("path");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.raw({ type: "*/*", limit: "250mb" }));

const WORKER_SECRET = process.env.WORKER_SECRET;

app.post("/extract", async (req, res) => {
  if (req.headers["x-worker-secret"] !== WORKER_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const inputExt = req.query.ext || "mp4";
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: "Missing file body" });
  }

  const jobId = randomUUID();
  const inputPath = join(tmpdir(), `${jobId}-in.${inputExt}`);
  const outputPath = join(tmpdir(), `${jobId}-out.mp3`);

  try {
    await writeFile(inputPath, req.body);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioChannels(1)
        .audioFrequency(16000)
        .audioBitrate("32k")
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const output = await readFile(outputPath);
    res.set("Content-Type", "audio/mpeg");
    res.send(output);
  } catch (err) {
    console.error("Extraction failed:", err);
    res.status(500).json({ error: "Extraction failed" });
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`ffmpeg worker listening on ${port}`));