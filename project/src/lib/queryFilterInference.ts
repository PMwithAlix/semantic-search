/** Client-side preview of backend query intent (backend is authoritative at search time). */

export interface InferredMetadataFilter {
  field: string;
  value: string;
  reasonKey: string;
}

export interface InferredQueryIntent {
  filters: Record<string, string>;
  reasonKeys: string[];
  strict: boolean;
}

interface FilterRule {
  field: string;
  value: string;
  reasonKey: string;
  patterns: RegExp[];
  contextPatterns?: RegExp[];
}

const ORIGIN_CONTEXT = [/مبدأ/u, /مبدا/u, /از\s+مب/u, /موقعیت\s+پایانه/u, /terminal/i, /origin/i];
const DESTINATION_CONTEXT = [/مقصد/u, /مقصدش/u, /به\s+شبکه/u, /destination/i, /calls?\s+to/i];

const ORIGIN_COUNTRIES: FilterRule[] = [
  { field: 'Country', value: 'Iran', reasonKey: 'search.infer.iranOrigin', patterns: [/ایران/u, /\bIran\b/i] },
  { field: 'Country', value: 'Iraq', reasonKey: 'search.infer.iraqOrigin', patterns: [/عراق/u, /\bIraq\b/i] },
  { field: 'Country', value: 'Kuwait', reasonKey: 'search.infer.kuwaitOrigin', patterns: [/کویت/u, /\bKuwait\b/i] },
];

const DESTINATION_COUNTRIES: FilterRule[] = [
  {
    field: 'OtherPartyCountry',
    value: 'United Arab Emirates',
    reasonKey: 'search.infer.uaeDestination',
    patterns: [/امارات/u, /\bUAE\b/i, /United Arab Emirates/i, /متحده\s*عربی/u, /Emirates/i],
  },
  {
    field: 'OtherPartyCountry',
    value: 'Qatar',
    reasonKey: 'search.infer.qatarDestination',
    patterns: [/قطر/u, /\bQatar\b/i],
  },
  {
    field: 'OtherPartyCountry',
    value: 'Thuraya',
    reasonKey: 'search.infer.thurayaDestination',
    patterns: [/ثریا/u, /\bThuraya\b/i, /00882/u],
  },
  {
    field: 'OtherPartyCountry',
    value: 'Iraq',
    reasonKey: 'search.infer.iraqDestination',
    patterns: [/عراق/u, /\bIraq\b/i],
  },
];

const STANDALONE_RULES: FilterRule[] = [
  {
    field: 'OtherPartyCountry',
    value: 'United Arab Emirates',
    reasonKey: 'search.infer.uaeDestination',
    patterns: [/تماس.*(?:مقصد|به).*امارات/u, /مقصد.*امارات/u, /امارات.*\(UAE\)/iu],
  },
  {
    field: 'Country',
    value: 'Iran',
    reasonKey: 'search.infer.iranOrigin',
    patterns: [/تماس.*(?:مبدا|مبدأ|از).*ایران/u, /(?:مبدا|مبدأ).*ایران/u],
  },
  {
    field: 'Country',
    value: 'Iraq',
    reasonKey: 'search.infer.iraqOrigin',
    patterns: [/تماس.*(?:مبدا|مبدأ|از).*عراق/u, /(?:مبدا|مبدأ).*عراق/u],
  },
  {
    field: 'OtherPartyCountry',
    value: 'Thuraya',
    reasonKey: 'search.infer.thurayaDestination',
    patterns: [/تماس.*ثریا/u, /شبکه\s*ثریا/u, /thuraya\s*call/i],
  },
];

function matchesRule(query: string, rule: FilterRule): boolean {
  if (!rule.patterns.some((p) => p.test(query))) return false;
  if (!rule.contextPatterns?.length) return true;
  return rule.contextPatterns.some((p) => p.test(query));
}

function matchCountryRules(query: string, rules: FilterRule[], context: RegExp[]): FilterRule | null {
  if (!context.some((p) => p.test(query))) return null;
  return rules.find((rule) => matchesRule(query, { ...rule, contextPatterns: undefined })) ?? null;
}

/** Preview inferred filters (backend applies the same logic on search). */
export function inferQueryIntent(query: string): InferredQueryIntent {
  const normalized = query.trim();
  if (!normalized) return { filters: {}, reasonKeys: [], strict: false };

  const filters: Record<string, string> = {};
  const reasonKeys: string[] = [];
  const hasOrigin = ORIGIN_CONTEXT.some((p) => p.test(normalized));
  const hasDestination = DESTINATION_CONTEXT.some((p) => p.test(normalized));

  if (hasOrigin && !hasDestination) {
    const rule = matchCountryRules(normalized, ORIGIN_COUNTRIES, ORIGIN_CONTEXT);
    if (rule) {
      filters[rule.field] = rule.value;
      reasonKeys.push(rule.reasonKey);
    }
  }

  if (hasDestination && !hasOrigin) {
    const rule = matchCountryRules(normalized, DESTINATION_COUNTRIES, DESTINATION_CONTEXT);
    if (rule) {
      filters[rule.field] = rule.value;
      reasonKeys.push(rule.reasonKey);
    }
  }

  if (hasOrigin && hasDestination) {
    for (const rules of [ORIGIN_COUNTRIES, DESTINATION_COUNTRIES]) {
      const rule = rules.find((r) => r.patterns.some((p) => p.test(normalized)));
      if (rule) {
        filters[rule.field] = rule.value;
        reasonKeys.push(rule.reasonKey);
      }
    }
  }

  if (Object.keys(filters).length === 0) {
    for (const rule of STANDALONE_RULES) {
      if (rule.patterns.some((p) => p.test(normalized))) {
        filters[rule.field] = rule.value;
        reasonKeys.push(rule.reasonKey);
        break;
      }
    }
  }

  return { filters, reasonKeys, strict: Object.keys(filters).length > 0 };
}

/** @deprecated use inferQueryIntent */
export function inferMetadataFilter(query: string): InferredMetadataFilter | null {
  const intent = inferQueryIntent(query);
  const entries = Object.entries(intent.filters);
  if (!entries.length) return null;
  const [field, value] = entries[0];
  return { field, value, reasonKey: intent.reasonKeys[0] ?? 'search.infer.generic' };
}
