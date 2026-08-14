import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    const apiUrl = process.env.SPRING_BOOT_API_URL;
    if (!apiUrl) {
      throw new Error(
        'Missing required environment variable: SPRING_BOOT_API_URL.\n' +
          'Every browser request is rewritten to it, so the app cannot start ' +
          'without one. Set it in .env.local for local development, or in your ' +
          "hosting provider's environment settings for deployed builds. " +
          'See .env.example.',
      );
    }

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
