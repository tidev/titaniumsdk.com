import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  redirects() {
    return [
      {
        // The old site served the mark from this path; it is embedded in
        // third-party posts and docs. 308 preserves the method and tells
        // crawlers the move is permanent.
        source: "/images/icons/icon-titanium-red.svg",
        destination: "/ti-logo.svg",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
