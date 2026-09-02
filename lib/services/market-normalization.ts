const MARKET_ALIASES: Record<string, string> = {
  eu: 'EU',
  eudr: 'EUDR',
  uk: 'UK',
  gb: 'UK',
  uk_environment_act: 'UK_Environment_Act',
  uk_environment: 'UK_Environment_Act',
  us: 'US',
  usa: 'US',
  china: 'CHINA',
  cn: 'CHINA',
  uae: 'UAE',
  ae: 'UAE',
};

export function normalizeMarketCode(value: string): string {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return MARKET_ALIASES[key] ?? value.trim().toUpperCase();
}

export function normalizeMarketCodes(values: string[] | null | undefined): string[] {
  if (!values || values.length === 0) return [];
  return [...new Set(values.map(normalizeMarketCode).filter(Boolean))];
}

