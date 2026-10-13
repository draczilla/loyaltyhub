/**
 * Country code detection utilities
 * Detects country code based on IP geolocation and browser locale
 */

interface CountryInfo {
  code: string;
  dialCode: string;
  name: string;
}

// Map of common country codes to dial codes
const COUNTRY_DIAL_CODES: Record<string, CountryInfo> = {
  US: { code: 'US', dialCode: '+1', name: 'United States' },
  CA: { code: 'CA', dialCode: '+1', name: 'Canada' },
  GB: { code: 'GB', dialCode: '+44', name: 'United Kingdom' },
  AU: { code: 'AU', dialCode: '+61', name: 'Australia' },
  NZ: { code: 'NZ', dialCode: '+64', name: 'New Zealand' },
  DE: { code: 'DE', dialCode: '+49', name: 'Germany' },
  FR: { code: 'FR', dialCode: '+33', name: 'France' },
  ES: { code: 'ES', dialCode: '+34', name: 'Spain' },
  IT: { code: 'IT', dialCode: '+39', name: 'Italy' },
  NL: { code: 'NL', dialCode: '+31', name: 'Netherlands' },
  BE: { code: 'BE', dialCode: '+32', name: 'Belgium' },
  SE: { code: 'SE', dialCode: '+46', name: 'Sweden' },
  NO: { code: 'NO', dialCode: '+47', name: 'Norway' },
  DK: { code: 'DK', dialCode: '+45', name: 'Denmark' },
  FI: { code: 'FI', dialCode: '+358', name: 'Finland' },
  PL: { code: 'PL', dialCode: '+48', name: 'Poland' },
  PT: { code: 'PT', dialCode: '+351', name: 'Portugal' },
  IE: { code: 'IE', dialCode: '+353', name: 'Ireland' },
  CH: { code: 'CH', dialCode: '+41', name: 'Switzerland' },
  AT: { code: 'AT', dialCode: '+43', name: 'Austria' },
  JP: { code: 'JP', dialCode: '+81', name: 'Japan' },
  KR: { code: 'KR', dialCode: '+82', name: 'South Korea' },
  CN: { code: 'CN', dialCode: '+86', name: 'China' },
  IN: { code: 'IN', dialCode: '+91', name: 'India' },
  BR: { code: 'BR', dialCode: '+55', name: 'Brazil' },
  MX: { code: 'MX', dialCode: '+52', name: 'Mexico' },
  AR: { code: 'AR', dialCode: '+54', name: 'Argentina' },
  CL: { code: 'CL', dialCode: '+56', name: 'Chile' },
  CO: { code: 'CO', dialCode: '+57', name: 'Colombia' },
  ZA: { code: 'ZA', dialCode: '+27', name: 'South Africa' },
  SG: { code: 'SG', dialCode: '+65', name: 'Singapore' },
  MY: { code: 'MY', dialCode: '+60', name: 'Malaysia' },
  TH: { code: 'TH', dialCode: '+66', name: 'Thailand' },
  ID: { code: 'ID', dialCode: '+62', name: 'Indonesia' },
  PH: { code: 'PH', dialCode: '+63', name: 'Philippines' },
  VN: { code: 'VN', dialCode: '+84', name: 'Vietnam' },
  IL: { code: 'IL', dialCode: '+972', name: 'Israel' },
  AE: { code: 'AE', dialCode: '+971', name: 'United Arab Emirates' },
  SA: { code: 'SA', dialCode: '+966', name: 'Saudi Arabia' },
  TR: { code: 'TR', dialCode: '+90', name: 'Turkey' },
  RU: { code: 'RU', dialCode: '+7', name: 'Russia' },
  UA: { code: 'UA', dialCode: '+380', name: 'Ukraine' },
  GR: { code: 'GR', dialCode: '+30', name: 'Greece' },
  CZ: { code: 'CZ', dialCode: '+420', name: 'Czech Republic' },
  HU: { code: 'HU', dialCode: '+36', name: 'Hungary' },
  RO: { code: 'RO', dialCode: '+40', name: 'Romania' },
};

/**
 * Detect country from browser locale
 * Falls back through various locale detection methods
 */
function getCountryFromLocale(): string | null {
  try {
    // Try navigator.language (e.g., "en-US", "fr-FR")
    const language = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage;
    if (language && language.includes('-')) {
      const countryCode = language.split('-')[1].toUpperCase();
      if (COUNTRY_DIAL_CODES[countryCode]) {
        return countryCode;
      }
    }

    // Try navigator.languages array
    if (navigator.languages) {
      for (const lang of navigator.languages) {
        if (lang.includes('-')) {
          const countryCode = lang.split('-')[1].toUpperCase();
          if (COUNTRY_DIAL_CODES[countryCode]) {
            return countryCode;
          }
        }
      }
    }

    // Try timezone-based detection as last resort
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      // Simple timezone to country mapping for common cases
      const timezoneCountryMap: Record<string, string> = {
        'America/New_York': 'US',
        'America/Chicago': 'US',
        'America/Denver': 'US',
        'America/Los_Angeles': 'US',
        'America/Toronto': 'CA',
        'America/Vancouver': 'CA',
        'Europe/London': 'GB',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/Madrid': 'ES',
        'Europe/Rome': 'IT',
        'Europe/Amsterdam': 'NL',
        'Europe/Oslo': 'NO',
        'Europe/Stockholm': 'SE',
        'Europe/Copenhagen': 'DK',
        'Europe/Helsinki': 'FI',
        'Asia/Tokyo': 'JP',
        'Asia/Seoul': 'KR',
        'Asia/Shanghai': 'CN',
        'Asia/Singapore': 'SG',
        'Australia/Sydney': 'AU',
        'Pacific/Auckland': 'NZ',
      };

      if (timezoneCountryMap[timezone]) {
        return timezoneCountryMap[timezone];
      }
    }
  } catch (error) {
    console.error('Error detecting country from locale:', error);
  }

  return null;
}

/**
 * Detect country from IP address using a free geolocation API
 * Returns country code or null if detection fails
 */
async function getCountryFromIP(): Promise<string | null> {
  try {
    // Use ipapi.co free API (no key required, 30k requests/month)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const countryCode = data.country_code;

    if (countryCode && COUNTRY_DIAL_CODES[countryCode]) {
      return countryCode;
    }
  } catch (error) {
    // Silently fail - this is a nice-to-have feature
    console.debug('IP-based country detection failed:', error);
  }

  return null;
}

/**
 * Get the dial code for a country
 */
export function getDialCode(countryCode: string): string {
  return COUNTRY_DIAL_CODES[countryCode]?.dialCode || '+1';
}

/**
 * Get country info for a country code
 */
export function getCountryInfo(countryCode: string): CountryInfo | null {
  return COUNTRY_DIAL_CODES[countryCode] || null;
}

/**
 * Get all available countries
 */
export function getAllCountries(): CountryInfo[] {
  return Object.values(COUNTRY_DIAL_CODES);
}

/**
 * Detect user's country and return dial code
 * Priority: 1. IP geolocation, 2. Browser locale, 3. Default to US (+1)
 */
export async function detectCountryDialCode(): Promise<{ countryCode: string; dialCode: string; source: string }> {
  // Try IP-based detection first (most accurate)
  const ipCountry = await getCountryFromIP();
  if (ipCountry) {
    return {
      countryCode: ipCountry,
      dialCode: getDialCode(ipCountry),
      source: 'ip',
    };
  }

  // Fall back to locale-based detection
  const localeCountry = getCountryFromLocale();
  if (localeCountry) {
    return {
      countryCode: localeCountry,
      dialCode: getDialCode(localeCountry),
      source: 'locale',
    };
  }

  // Default to US
  return {
    countryCode: 'US',
    dialCode: '+1',
    source: 'default',
  };
}
