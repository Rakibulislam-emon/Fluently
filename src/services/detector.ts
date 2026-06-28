/**
 * Language Detector — Custom Heuristics
 *
 * Detects Bangla (Unicode), Banglish (romanized tokens), or English.
 * Does NOT use franc — custom rules for South Asian text.
 */

const BANGLISH_TOKENS = new Set([
  // pronouns
  "ami", "tumi", "apni", "tui", "se", "ora", "amra", "tomra", "tora", "amar", "tomar", "tar", "tader", "amader", "tomader", "or",
  // verbs
  "koro", "korbo", "korte", "korsi", "korlam", "korben", "korbe", "kor", "koris",
  "hobe", "hobo", "holo", "hoyeche", "hocche", "hoye", "hoisey", "hoise", "hoilo", "hoitese",
  "ache", "achi", "thako", "thaki", "thakbo", "asi", "ase", "chilo", "thakbe",
  "jabo", "jabi", "jan", "jao", "jaitesi", "jacche", "jai", "jabey", "gelo", "gese", "gesi", "gelam",
  "asho", "asen", "aso", "astesi", "asche", "ashbe", "aslam",
  "khabo", "bolbo", "dekhbo", "likhbo", "shunbo",
  "bujhi", "bujhte", "bujhtesi", "bujhlam",
  "pare", "pari", "parbo", "parbe", "pari na", "parso",
  "dibo", "dimu", "nebo", "nibo", "disi", "dilo", "niye",
  "lagche", "lagbe", "laglo",
  // negation
  "nai", "nei", "na", "ni", "naki",
  // question words
  "keno", "kothay", "kokhon", "kivabe", "ki", "ke", "koto", "kobe", "kar", "koi",
  // kinship / address
  "bhai", "vai", "apa", "dada", "mama", "chacha", "bhabi",
  // common words & slang
  "ektu", "onek", "kichhu", "shob", "ar", "ba", "o", "kisu", "kisui", "ekdom", "ekdomi",
  "achha", "thik", "haa", "hmm", "ji",
  "chill", "pls", "plz", "faltu", "shala", "pagol", "bhalobashi", "valo", "kharap",
  // temporal & spatial
  "aj", "ajke", "kal", "kalke", "porashu", "ekhon", "tokhon", "pore", "aage",
  // conjunctions & prepositions
  "kintu", "jodi", "tahole", "tobu", "karon", "jonno", "er", "theke", "sathe",
  // pronouns/demonstratives
  "eta", "eita", "seta", "seita", "ota", "oita", "jeta", "ekta", "duta", "gula", "gulo",
  // emphasize
  "kina", "tai", "naki"
]);

export type Language = "bangla" | "banglish" | "english";

export function detectLanguage(text: string): Language {
  // 1. Bengali Unicode check (U+0980–U+09FF)
  if (/[\u0980-\u09FF]/.test(text)) {
    return "bangla";
  }

  // 2. Banglish token matching
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  const banglishCount = words.filter((w) => BANGLISH_TOKENS.has(w)).length;

  // Trigger if 25%+ of words are Banglish OR at least 2 tokens match
  if (words.length > 0 && (banglishCount / words.length >= 0.25 || banglishCount >= 2)) {
    return "banglish";
  }

  // 3. Default
  return "english";
}
