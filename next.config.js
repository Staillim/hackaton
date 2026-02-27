/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com', 
      'supabase.co',
      'drinkcentral.co',
      'www.coca-cola.com',
      'hatsu.co'
    ],
  },
}

module.exports = nextConfig
