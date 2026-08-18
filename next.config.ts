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

    // Mesma normalização de `serverEnv.API_URL`, repetida aqui porque o
    // next.config é carregado antes do alias `@/` existir. Sem ela, uma barra
    // final na variável vira `//api/...` no destino, e o StrictHttpFirewall do
    // Spring Security responde 400 sem chegar a nenhum controller.
    const origin = apiUrl.replace(/\/+$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${origin}/api/:path*`,
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
