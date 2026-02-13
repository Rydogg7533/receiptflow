/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js', 'openai'],
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
