/**
 * FR-1.4: fuzzy filtering for the slash menu, by name and alias.
 *
 * Pure, dependency-free matching (the rule is no new libraries unless
 * essential). Each query token must match one of the item fields; a token
 * matches either as a substring (best when it starts at a word boundary) or
 * as a fuzzy subsequence of the field. Fields weigh label > alias >
 * keyword > description so top results feel like Notion rather than a
 * random subsequence soup. Exported from `lib/` so node:test can drive it.
 */

export interface FilterableSlashItem {
  label: string;
  description?: string;
  keywords?: readonly string[];
  aliases?: readonly string[];
}

/**
 * Score a single token against one field, or null when it does not match.
 * Higher is better; word-boundary substrings beat mid-string substrings
 * beat subsequences, and closer matches win inside the same class.
 */
export function fuzzyMatchScore(token: string, text: string): number | null {
  if (token === "" || text === "") {
    return null;
  }
  const index = text.indexOf(token);
  if (index >= 0) {
    const atWordStart = index === 0 || !isWordChar(text[index - 1]!);
    return (atWordStart ? 200 : 120) + Math.max(0, 20 - index);
  }
  // Fuzzy fallback: every token character must appear in order.
  let from = 0;
  let streak = 0;
  let score = 0;
  for (const character of token) {
    const found = text.indexOf(character, from);
    if (found === -1) {
      return null;
    }
    // Contiguous characters (an acronym like "bd" in "bulleted") score
    // higher than scattered ones.
    streak = found === from ? streak + 1 : 0;
    score += 4 + Math.min(streak, 4) * 2;
    from = found + 1;
  }
  return 40 + score;
}

function isWordChar(character: string): boolean {
  return /[a-z0-9]/i.test(character);
}

/** Best weighted score of one token across all fields, or null if no field matches. */
function bestTokenScore(
  token: string,
  item: FilterableSlashItem,
): number | null {
  const label = item.label.toLowerCase();
  const description = item.description?.toLowerCase();
  const candidates: Array<[number | null, number]> = [
    [fuzzyMatchScore(token, label), 3],
    ...(item.aliases ?? []).map((alias): [number | null, number] => [
      fuzzyMatchScore(token, alias.toLowerCase()),
      2,
    ]),
    ...(item.keywords ?? []).map((keyword): [number | null, number] => [
      fuzzyMatchScore(token, keyword.toLowerCase()),
      1,
    ]),
    [description ? fuzzyMatchScore(token, description) : null, 0.5],
  ];
  let best: number | null = null;
  for (const [score, weight] of candidates) {
    if (score === null) {
      continue;
    }
    const weighted = score * weight;
    if (best === null || weighted > best) {
      best = weighted;
    }
  }
  return best;
}

/**
 * Filter and rank slash items for a query. Every token must match; matches
 * are ordered by total score (higher first), ties keep the original order.
 * An empty query returns all items in their original order.
 */
export function filterSlashItems<T extends FilterableSlashItem>(
  items: readonly T[],
  query: string,
): T[] {
  const tokens = query.trim().toLowerCase().split(/\s+/);
  if (tokens.length === 1 && tokens[0] === "") {
    return [...items];
  }
  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    let total = 0;
    let matched = true;
    for (const token of tokens) {
      const score = bestTokenScore(token, item);
      if (score === null) {
        matched = false;
        break;
      }
      total += score;
    }
    if (matched) {
      scored.push({ item, score: total });
    }
  }
  // Array#sort is stable in modern engines, so ties keep insertion order.
  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.item);
}
