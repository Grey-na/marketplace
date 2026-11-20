import type { NextConfig } from "next";

const apiUrl = process.env.API_URL || "http://localhost:3005";

const nextConfig: NextConfig = {
  // the browser calls /api/... on port 3000 and Next forwards it to the backend.
  // One address means no CORS trouble, and the login cookie just works
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },          // the demo pictures
      { protocol: "http", hostname: "localhost", port: "3005" }, // pictures uploaded to your backend
    ],
  },
};

export default nextConfig;