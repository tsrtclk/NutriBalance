export const SUPPORTED_LOCALES = ["tr-TR", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr-TR";
