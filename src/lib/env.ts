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
  get API_URL(): string {
    return required('SPRING_BOOT_API_URL');
  },
} as const;
