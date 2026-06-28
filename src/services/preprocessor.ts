/**
 * Normalizes chaotic Banglish spelling variations into a standard form 
 * before sending them to the LLM. This drastically improves the AI's 
 * ability to comprehend semantic meaning and emotional nuance.
 */

const NORMALIZATIONS: Record<string, string> = {
  // Emotion / Feeling
  "vallagtasey": "valo lagtese",
  "vallagtese": "valo lagtese",
  "vallagtesena": "valo lagtese na",
  "vallagena": "valo lage na",
  "valagtese": "valo lagtese",
  
  // Common Slang & Abbreviations
  "kmn": "kemon",
  "amk": "amake",
  "tmk": "tomake",
  "asmu": "asbo",
  "jamu": "jabo",
  "dimu": "dibo",
  "khamu": "khabo",
  
  // Honorifics & Address
  "vai": "bhai",
  "vaya": "bhaiya",
  "bhaiya": "bhai",
};

export function preprocessBanglish(text: string): string {
  let processed = text;
  
  Object.entries(NORMALIZATIONS).forEach(([chaotic, standard]) => {
    // Word boundary \b handles standalone words case-insensitively
    const regex = new RegExp(`\\b${chaotic}\\b`, 'gi');
    processed = processed.replace(regex, standard);
  });
  
  return processed;
}
