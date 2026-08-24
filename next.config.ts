import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev overlay out of checkpoint screenshots. Compile and runtime
  // errors are still surfaced.
  devIndicators: false,
};

export default nextConfig;
