function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}.\n` +
        `Set it in .env.local for local development, or in your hosting ` +
        `provider's environment settings for deployed builds. ` +
        `See .env.example for the full list.`,
    );
  }
  return value;
}

export const serverEnv = {
  // A barra final é removida porque quem chama sempre concatena um caminho que
  // já começa com barra. Deixá-la passar produz `//api/...`, que o
  // StrictHttpFirewall do Spring Security recusa com 400 antes do controller.
  get API_URL(): string {
    return required('SPRING_BOOT_API_URL').replace(/\/+$/, '');
  },

  get SITE_URL(): string {
    const explicit = process.env.SITE_URL;
    if (explicit) return explicit.replace(/\/+$/, '');

    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercel) return `https://${vercel}`;

    return 'http://localhost:3000';
  },
} as const;
