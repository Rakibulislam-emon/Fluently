/**
 * Diff Engine — Local Grammar Analysis
 *
 * Compares original vs corrected text word-by-word.
 * Detects grammar categories and generates micro-explanations.
 * Runs entirely locally — zero API cost.
 *
 * Rule: Keep category detection SIMPLE. Only detect obvious patterns.
 * False explanations destroy trust instantly.
 */

export type DiffSegment =
  | { type: "unchanged"; text: string }
  | { type: "changed"; from: string; to: string };

export type GrammarCategory =
  | "capitalization"
  | "contraction"
  | "punctuation"
  | "tense"
  | "article"
  | "spelling"
  | "general";

/**
 * Compute word-level diff between original and corrected text.
 * Uses a simple LCS-based approach for short texts.
 */
export function computeWordDiff(original: string, corrected: string): DiffSegment[] {
  const origWords = tokenize(original);
  const corrWords = tokenize(corrected);

  // Build LCS table
  const m = origWords.length;
  const n = corrWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1].toLowerCase() === corrWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const segments: DiffSegment[] = [];
  let i = m, j = n;

  const pendingOrig: string[] = [];
  const pendingCorr: string[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1].toLowerCase() === corrWords[j - 1].toLowerCase()) {
      // Flush pending changes
      flushPending(segments, pendingOrig, pendingCorr);

      // Check if it's a capitalization-only change
      if (origWords[i - 1] !== corrWords[j - 1]) {
        segments.unshift({ type: "changed", from: origWords[i - 1], to: corrWords[j - 1] });
      } else {
        segments.unshift({ type: "unchanged", text: corrWords[j - 1] });
      }
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      pendingCorr.unshift(corrWords[j - 1]);
      j--;
    } else {
      pendingOrig.unshift(origWords[i - 1]);
      i--;
    }
  }

  flushPending(segments, pendingOrig, pendingCorr);

  // Merge consecutive unchanged segments
  return mergeUnchanged(segments);
}

function flushPending(segments: DiffSegment[], pendingOrig: string[], pendingCorr: string[]): void {
  if (pendingOrig.length > 0 || pendingCorr.length > 0) {
    segments.unshift({
      type: "changed",
      from: pendingOrig.join(" "),
      to: pendingCorr.join(" "),
    });
    pendingOrig.length = 0;
    pendingCorr.length = 0;
  }
}

function mergeUnchanged(segments: DiffSegment[]): DiffSegment[] {
  const merged: DiffSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (seg.type === "unchanged" && last?.type === "unchanged") {
      last.text += " " + seg.text;
    } else {
      merged.push(seg);
    }
  }
  return merged;
}

function tokenize(text: string): string[] {
  // Split on whitespace but keep punctuation attached to words
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Detect the primary grammar category from diff segments.
 * ONLY detects obvious, high-confidence patterns.
 * Everything uncertain falls back to "general".
 */
export function detectCategory(diff: DiffSegment[]): GrammarCategory {
  const changes = diff.filter((s): s is Extract<DiffSegment, { type: "changed" }> => s.type === "changed");

  if (changes.length === 0) return "general";

  // Check each change for patterns (first match wins)
  for (const change of changes) {
    const from = change.from.toLowerCase();
    const to = change.to.toLowerCase();

    // Capitalization only
    if (from === to && change.from !== change.to) {
      return "capitalization";
    }

    // Contraction fixes
    if (isContractionFix(from, to)) {
      return "contraction";
    }

    // Article fixes
    if (isArticleFix(from, to)) {
      return "article";
    }

    // Tense fixes
    if (isTenseFix(from, to)) {
      return "tense";
    }

    // Punctuation-only changes
    if (isPunctuationFix(change.from, change.to)) {
      return "punctuation";
    }

    // Spelling (very similar words — likely typo)
    if (isSpellingFix(from, to)) {
      return "spelling";
    }
  }

  return "general";
}

function isContractionFix(from: string, to: string): boolean {
  const contractionPairs: [string, string][] = [
    ["dont", "don't"], ["doesnt", "doesn't"], ["didnt", "didn't"],
    ["cant", "can't"], ["couldnt", "couldn't"], ["wouldnt", "wouldn't"],
    ["shouldnt", "shouldn't"], ["isnt", "isn't"], ["arent", "aren't"],
    ["wasnt", "wasn't"], ["werent", "weren't"], ["hasnt", "hasn't"],
    ["havent", "haven't"], ["hadnt", "hadn't"], ["wont", "won't"],
    ["im", "i'm"], ["ive", "i've"], ["id", "i'd"], ["ill", "i'll"],
    ["youre", "you're"], ["youve", "you've"], ["youd", "you'd"], ["youll", "you'll"],
    ["hes", "he's"], ["shes", "she's"], ["its", "it's"],
    ["theyre", "they're"], ["theyve", "they've"], ["theyd", "they'd"],
    ["were", "we're"], ["weve", "we've"], ["wed", "we'd"],
    ["thats", "that's"], ["whats", "what's"], ["whos", "who's"],
    ["lets", "let's"], ["theres", "there's"], ["heres", "here's"],
    // Also handle: don't → doesn't (subject-verb agreement via contraction)
    ["don't", "doesn't"], ["dont", "doesn't"],
  ];

  return contractionPairs.some(([a, b]) =>
    (from === a && to === b) || (from === b && to === a)
  );
}

function isArticleFix(from: string, to: string): boolean {
  const articles = ["a", "an", "the"];
  // Added or swapped article
  if (articles.includes(to) && (from === "" || articles.includes(from))) return true;
  if (articles.includes(from) && articles.includes(to)) return true;
  // Inserted article: "" → "the file" vs "file"
  if (from === "" && articles.some(a => to.startsWith(a + " "))) return true;
  return false;
}

function isTenseFix(from: string, to: string): boolean {
  const tensePairs: [string, string][] = [
    ["is", "was"], ["was", "is"],
    ["am", "was"], ["are", "were"], ["were", "are"],
    ["go", "went"], ["went", "go"],
    ["come", "came"], ["came", "come"],
    ["do", "did"], ["did", "do"],
    ["has", "had"], ["had", "has"],
    ["have", "had"],
    ["make", "made"], ["made", "make"],
    ["take", "took"], ["took", "take"],
    ["see", "saw"], ["saw", "see"],
    ["know", "knew"], ["knew", "know"],
    ["give", "gave"], ["gave", "give"],
    ["run", "ran"],
    ["say", "said"], ["said", "say"],
    ["get", "got"], ["got", "get"],
  ];

  if (tensePairs.some(([a, b]) => from === a && to === b)) return true;

  // -ed suffix added (walked, talked, etc.)
  if (to === from + "ed" || to === from + "d") return true;
  // -ing added
  if (to === from + "ing") return true;

  return false;
}

function isPunctuationFix(from: string, to: string): boolean {
  // Strip all punctuation and compare — if words are same, it's punctuation-only
  const stripPunct = (s: string) => s.replace(/[^\w\s]/g, "").toLowerCase().trim();
  return stripPunct(from) === stripPunct(to) && from !== to;
}

function isSpellingFix(from: string, to: string): boolean {
  // Simple Levenshtein distance check — if edit distance is 1-2, likely typo
  if (from.length < 3 || to.length < 3) return false;
  const dist = levenshtein(from, to);
  return dist > 0 && dist <= 2;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Get a one-line micro-explanation for a grammar category.
 * Tiny. Fast. Learnable.
 */
const EXPLANATIONS: Record<GrammarCategory, string> = {
  capitalization: "Sentences start with a capital letter.",
  contraction: "Contractions need apostrophes (e.g. don't, can't).",
  punctuation: "Punctuation adjusted for clarity.",
  tense: "Verb tense adjusted to match the time context.",
  article: "Articles (a/an/the) are needed before nouns in English.",
  spelling: "Spelling corrected.",
  general: "Phrasing improved for natural English.",
};

export function getMicroExplanation(category: GrammarCategory): string {
  return EXPLANATIONS[category];
}

/**
 * Check if the change is meaningful enough to show a popup.
 * Skip trivial changes like adding a single comma.
 */
export function isMeaningfulChange(original: string, corrected: string): boolean {
  // If texts are identical, no change
  if (original.trim() === corrected.trim()) return false;

  // Strip all punctuation/whitespace and compare — if identical, it's trivial
  const normalize = (s: string) => s.replace(/[^\w]/g, "").toLowerCase();
  if (normalize(original) === normalize(corrected)) return false;

  return true;
}
