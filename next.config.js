/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compiler: {
    styledComponents: true,
  },

  images: {
    domains: ["localhost"],
  },

  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.101:5050/api/v1",
    NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY:
      process.env.NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY || "",
  },
};

module.exports = nextConfig;
