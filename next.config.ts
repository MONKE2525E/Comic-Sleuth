import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbo: undefined,
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
