import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shop-phinf.pstatic.net',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
