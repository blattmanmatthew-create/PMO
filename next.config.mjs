/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk"],
    outputFileTracingIncludes: {
      "/api/excel/[id]": ["./lib/excel/pmo_template.xlsx"],
    },
  },
};

export default nextConfig;
