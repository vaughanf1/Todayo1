import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next infers the
  // root from the nearest lockfile and warns when several exist (there's a
  // stray package-lock.json in the home dir). This keeps dev + the Railway
  // build's output file tracing scoped to the app.
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
