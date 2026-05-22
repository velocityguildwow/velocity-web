import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "drizzle-orm", "@ravxd/velocitydb"],
};

export default nextConfig;
