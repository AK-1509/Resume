import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev overlay out of checkpoint screenshots. Compile and runtime
  // errors are still surfaced.
  devIndicators: false,

  // Project pages that were renamed or taken down. The old address was live,
  // so it keeps working: a renamed page passes on to its new address, a
  // removed one to the portfolio (temporary, so the address stays free).
  redirects() {
    return [
      {
        source: "/projects/dock-puck",
        destination: "/projects/snooze-station",
        permanent: true,
      },
      {
        source: "/projects/the-doghouse",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
