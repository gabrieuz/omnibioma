import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const scriptPolicy = process.env.NODE_ENV === "development"
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Content-Security-Policy", value: `default-src 'self'; img-src 'self' blob: data:; ${scriptPolicy}; style-src 'self' 'unsafe-inline'; connect-src 'self' https://generativelanguage.googleapis.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'` }
      ]
    }];
  }
};

export default withSerwist(nextConfig);
