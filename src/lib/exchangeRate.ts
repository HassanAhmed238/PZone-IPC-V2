/**
 * Exchange rate utility — fetches USD→EGP rate from CBE (primary) 
 * with a free API fallback. Cached in localStorage for 24 hours.
 */

const CACHE_KEY = "pzone_usd_egp_rate";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_RATE = 50.5; // reasonable default if all APIs fail

interface CachedRate {
  rate: number;
  source: string;
  fetchedAt: number;
}

function getCachedRate(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedRate = JSON.parse(raw);
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;
    return null; // expired
  } catch {
    return null;
  }
}

function setCachedRate(rate: number, source: string): void {
  const entry: CachedRate = { rate, source, fetchedAt: Date.now() };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable
  }
}

/** Try fetching from Central Bank of Egypt website */
async function fetchCBERate(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://www.cbe.org.eg/en/economic-research/statistics/exchange-rates",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const html = await res.text();
    // CBE page has a table with USD buy/sell rates
    // Look for the USD row and extract the sell rate
    const usdMatch = html.match(/USD[\s\S]*?(\d{2,3}\.\d{2,4})\s*<\/td>\s*<td[^>]*>\s*(\d{2,3}\.\d{2,4})/i);
    if (usdMatch) {
      const sellRate = parseFloat(usdMatch[2]);
      if (sellRate > 10 && sellRate < 200) return sellRate; // sanity check
    }
    return null;
  } catch {
    return null;
  }
}

/** Fallback: free exchange rate API */
async function fetchFreeAPIRate(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const egpRate = data?.rates?.EGP;
    if (typeof egpRate === "number" && egpRate > 10 && egpRate < 200) return egpRate;
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the current USD→EGP exchange rate.
 * Returns cached value if fresh, otherwise fetches from CBE (primary) 
 * or free API (fallback). Falls back to a hardcoded default if all fail.
 */
export async function getUsdToEgp(): Promise<{ rate: number; source: string }> {
  // 1. Check cache
  const cached = getCachedRate();
  if (cached) return { rate: cached.rate, source: cached.source };

  // 2. Try CBE
  const cbeRate = await fetchCBERate();
  if (cbeRate) {
    setCachedRate(cbeRate, "CBE");
    return { rate: cbeRate, source: "CBE" };
  }

  // 3. Try free API
  const freeRate = await fetchFreeAPIRate();
  if (freeRate) {
    setCachedRate(freeRate, "open.er-api.com");
    return { rate: freeRate, source: "open.er-api.com" };
  }

  // 4. Last resort — use stale cache if available, else hardcoded
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const stale: CachedRate = JSON.parse(raw);
      return { rate: stale.rate, source: `${stale.source} (stale)` };
    }
  } catch { /* ignore */ }

  return { rate: FALLBACK_RATE, source: "fallback" };
}

/**
 * Synchronous getter — returns the last cached rate or the fallback.
 * Use this in render paths where you can't await.
 */
export function getUsdToEgpSync(): number {
  const cached = getCachedRate();
  if (cached) return cached.rate;
  // Check stale cache
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw).rate;
  } catch { /* ignore */ }
  return FALLBACK_RATE;
}

/**
 * Convert an amount to EGP given its currency.
 * USD amounts are multiplied by the exchange rate.
 * EGP amounts pass through unchanged.
 */
export function toEgp(amount: number, currency: string, usdToEgpRate: number): number {
  if (currency === "USD") return amount * usdToEgpRate;
  return amount;
}
