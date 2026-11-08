import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (node .next/standalone/server.js)
  output: "standalone",
  serverExternalPackages: ["mongodb", "sharp"],
  // Dev only: let the Telegram mini app load through an https tunnel (cloudflared / ngrok).
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
