/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing from parent directory (Nexus wiki)
  experimental: {
    outputFileTracingIncludes: {
      "/**": ["../Nexus/wiki/**/*.md"],
    },
  },
};

export default nextConfig;
