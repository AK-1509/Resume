import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev overlay out of checkpoint screenshots. Compile and runtime
  // errors are still surfaced.
  devIndicators: false,

  // Project pages that were renamed. The old address was live, so it keeps
  // working and passes on to the new one.
  redirects() {
    return [
      {
        source: "/projects/dock-puck",
        destination: "/projects/snooze-station",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
