/**
 * Privacy Filter
 *
 * Detects sensitive content that should NOT trigger a feedback popup.
 * The rewrite still happens — but no popup is shown.
 *
 * Filters: credit cards, emails, URLs, OTPs, passwords/tokens.
 */

// Credit card: 4 groups of 4 digits
const CREDIT_CARD = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;

// Email address
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// URLs
const URL_PATTERN = /https?:\/\/\S+/i;

// Standalone OTP-like codes (4-6 digits alone or nearly alone)
const OTP = /^\s*\d{4,6}\s*$/;

// High-entropy strings (likely passwords/tokens) — 12+ chars with mixed case/digits/symbols
const HIGH_ENTROPY = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{12,}$/;

/**
 * Returns true if the text appears to contain sensitive content.
 * If true, the feedback popup should be suppressed.
 */
export function isSensitive(text: string): boolean {
  if (CREDIT_CARD.test(text)) return true;
  if (EMAIL.test(text)) return true;
  if (URL_PATTERN.test(text)) return true;
  if (OTP.test(text)) return true;

  // Check for high-entropy strings (each word)
  const words = text.split(/\s+/);
  const highEntropyCount = words.filter(w => HIGH_ENTROPY.test(w) && hasHighEntropy(w)).length;
  if (highEntropyCount > 0 && highEntropyCount / words.length > 0.3) return true;

  return false;
}

/**
 * Simple entropy check — does the string have a good mix of char types?
 */
function hasHighEntropy(str: string): boolean {
  if (str.length < 12) return false;
  const hasUpper = /[A-Z]/.test(str);
  const hasLower = /[a-z]/.test(str);
  const hasDigit = /\d/.test(str);
  const hasSymbol = /[^A-Za-z0-9]/.test(str);
  const typesPresent = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  return typesPresent >= 3;
}
