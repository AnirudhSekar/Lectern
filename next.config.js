/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ffmpeg-static", "fluent-ffmpeg"],
  outputFileTracingIncludes: {
    "/api/inngest/link/route": ["./node_modules/ffmpeg-static/**"],
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Accommodates any HTTPS domain
      },
      {
        protocol: 'http',
        hostname: '**', // Accommodates any HTTP domain
      },
    ],
  },
  async headers() {
    return [
      {
        // Required for ffmpeg.wasm's multi-threaded core (SharedArrayBuffer)
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
