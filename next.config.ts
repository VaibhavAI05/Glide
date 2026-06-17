import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
        protocol: "https",
      },
      {
        hostname: "*.googleusercontent.com",
        protocol: "https",
      },
      {
        hostname: "avatar.vercel.sh",
        protocol: "https",
      },
      {
        hostname: "9h7scht27a.ufs.sh",
        protocol: "https",
      },
      //CHANGES HERE ⛔
      {
        hostname: "gravatar.com",
        protocol: "https",
      },
      {
        hostname: "www.gravatar.com",
        protocol: "https",
      },
    ]
  },
};

export default nextConfig;
