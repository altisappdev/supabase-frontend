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
    NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY:
      process.env.NEXT_PUBLIC_PRIVATE_ENCRYPTION_KEY || "",
  },
};

module.exports = nextConfig;
