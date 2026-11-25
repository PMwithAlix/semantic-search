export type ErrorActionPage =
  | 'settings'
  | 'jobs'
  | 'datasets'
  | 'collections'
  | 'embedding-config'
  | 'job-details';

export interface ErrorGuidance {
  id: string;
  titleKey: string;
  summaryKey: string;
  causeKey: string;
  fixKeys: string[];
  action?: { labelKey: string; page: ErrorActionPage };
  severity: 'error' | 'warning';
}

interface ErrorRule {
  id: string;
  match: (message: string) => boolean;
  guidance: Omit<ErrorGuidance, 'id'>;
}

const RULES: ErrorRule[] = [
  {
    id: 'api_key_missing',
    match: (m) => /api key is not configured|avalai.*not configured/i.test(m),
    guidance: {
      titleKey: 'errors.apiKeyMissing.title',
      summaryKey: 'errors.apiKeyMissing.summary',
      causeKey: 'errors.apiKeyMissing.cause',
      fixKeys: [
        'errors.apiKeyMissing.fix1',
        'errors.apiKeyMissing.fix2',
        'errors.apiKeyMissing.fix3',
      ],
      action: { labelKey: 'errors.apiKeyMissing.action', page: 'settings' },
      severity: 'error',
    },
  },
  {
    id: 'api_key_invalid',
    match: (m) => /401|403|unauthorized|invalid.*key|authentication/i.test(m),
    guidance: {
      titleKey: 'errors.apiKeyInvalid.title',
      summaryKey: 'errors.apiKeyInvalid.summary',
      causeKey: 'errors.apiKeyInvalid.cause',
      fixKeys: ['errors.apiKeyInvalid.fix1', 'errors.apiKeyInvalid.fix2', 'errors.apiKeyInvalid.fix3'],
      action: { labelKey: 'errors.apiKeyInvalid.action', page: 'settings' },
      severity: 'error',
    },
  },
  {
    id: 'embedding_api_failure',
    match: (m) => /embedding request failed|embeddings.*failed|avalai/i.test(m),
    guidance: {
      titleKey: 'errors.embeddingApi.title',
      summaryKey: 'errors.embeddingApi.summary',
      causeKey: 'errors.embeddingApi.cause',
      fixKeys: [
        'errors.embeddingApi.fix1',
        'errors.embeddingApi.fix2',
        'errors.embeddingApi.fix3',
        'errors.embeddingApi.fix4',
      ],
      action: { labelKey: 'errors.embeddingApi.action', page: 'jobs' },
      severity: 'error',
    },
  },
  {
    id: 'network_timeout',
    match: (m) => /timeout|timed out|read timeout|connect timeout/i.test(m),
    guidance: {
      titleKey: 'errors.networkTimeout.title',
      summaryKey: 'errors.networkTimeout.summary',
      causeKey: 'errors.networkTimeout.cause',
      fixKeys: ['errors.networkTimeout.fix1', 'errors.networkTimeout.fix2', 'errors.networkTimeout.fix3'],
      severity: 'warning',
    },
  },
  {
    id: 'network_error',
    match: (m) => /connection refused|network|fetch failed|ECONNREFUSED|not reachable/i.test(m),
    guidance: {
      titleKey: 'errors.networkError.title',
      summaryKey: 'errors.networkError.summary',
      causeKey: 'errors.networkError.cause',
      fixKeys: ['errors.networkError.fix1', 'errors.networkError.fix2', 'errors.networkError.fix3'],
      severity: 'error',
    },
  },
  {
    id: 'resume_instead',
    match: (m) => /resume the failed job|failed for this collection/i.test(m),
    guidance: {
      titleKey: 'errors.resumeInstead.title',
      summaryKey: 'errors.resumeInstead.summary',
      causeKey: 'errors.resumeInstead.cause',
      fixKeys: ['errors.resumeInstead.fix1', 'errors.resumeInstead.fix2'],
      action: { labelKey: 'errors.resumeInstead.action', page: 'jobs' },
      severity: 'warning',
    },
  },
  {
    id: 'dataset_not_imported',
    match: (m) => /must be imported|import before embedding/i.test(m),
    guidance: {
      titleKey: 'errors.datasetNotImported.title',
      summaryKey: 'errors.datasetNotImported.summary',
      causeKey: 'errors.datasetNotImported.cause',
      fixKeys: ['errors.datasetNotImported.fix1', 'errors.datasetNotImported.fix2'],
      action: { labelKey: 'errors.datasetNotImported.action', page: 'datasets' },
      severity: 'warning',
    },
  },
  {
    id: 'collection_not_ready',
    match: (m) => /collection is not ready|not ready for search/i.test(m),
    guidance: {
      titleKey: 'errors.collectionNotReady.title',
      summaryKey: 'errors.collectionNotReady.summary',
      causeKey: 'errors.collectionNotReady.cause',
      fixKeys: ['errors.collectionNotReady.fix1', 'errors.collectionNotReady.fix2'],
      action: { labelKey: 'errors.collectionNotReady.action', page: 'jobs' },
      severity: 'warning',
    },
  },
  {
    id: 'collection_exists',
    match: (m) => /ready collection already exists/i.test(m),
    guidance: {
      titleKey: 'errors.collectionExists.title',
      summaryKey: 'errors.collectionExists.summary',
      causeKey: 'errors.collectionExists.cause',
      fixKeys: ['errors.collectionExists.fix1', 'errors.collectionExists.fix2'],
      action: { labelKey: 'errors.collectionExists.action', page: 'collections' },
      severity: 'warning',
    },
  },
  {
    id: 'csv_only',
    match: (m) => /only csv|csv files are supported/i.test(m),
    guidance: {
      titleKey: 'errors.csvOnly.title',
      summaryKey: 'errors.csvOnly.summary',
      causeKey: 'errors.csvOnly.cause',
      fixKeys: ['errors.csvOnly.fix1'],
      severity: 'warning',
    },
  },
  {
    id: 'file_too_large',
    match: (m) => /exceeds maximum|file too large|max_upload/i.test(m),
    guidance: {
      titleKey: 'errors.fileTooLarge.title',
      summaryKey: 'errors.fileTooLarge.summary',
      causeKey: 'errors.fileTooLarge.cause',
      fixKeys: ['errors.fileTooLarge.fix1', 'errors.fileTooLarge.fix2'],
      severity: 'warning',
    },
  },
];

const FALLBACK: Omit<ErrorGuidance, 'id'> = {
  titleKey: 'errors.generic.title',
  summaryKey: 'errors.generic.summary',
  causeKey: 'errors.generic.cause',
  fixKeys: ['errors.generic.fix1', 'errors.generic.fix2'],
  severity: 'error',
};

export function resolveErrorGuidance(rawMessage: string | undefined | null): ErrorGuidance {
  const message = (rawMessage ?? '').trim();
  if (!message) {
    return { id: 'unknown', ...FALLBACK };
  }

  for (const rule of RULES) {
    if (rule.match(message)) {
      return { id: rule.id, ...rule.guidance };
    }
  }

  return {
    id: 'generic',
    ...FALLBACK,
    summaryKey: 'errors.generic.summaryWithDetail',
  };
}

export function translateErrorMessage(message: string, lang: 'en' | 'fa'): string {
  if (lang === 'en') return message;
  const faMap: Record<string, string> = {
    'AvalAI API key is not configured': 'کلید API AvalAI تنظیم نشده است',
    'Dataset not found': 'دیتاست پیدا نشد',
    'Collection is not ready for search': 'کالکشن برای جستجو آماده نیست',
    'Only CSV files are supported': 'فقط فایل CSV پشتیبانی می‌شود',
    'An embedding job failed for this collection. Resume the failed job instead of creating a new one.':
      'یک job امبدینگ برای این collection ناموفق بود. job قبلی را Resume کنید.',
    'Only failed jobs can be resumed': 'فقط jobهای ناموفق قابل Resume هستند',
    'Dataset must be imported before embedding': 'قبل از امبدینگ باید دیتاست import شود',
  };
  if (faMap[message]) return faMap[message];
  if (/Embedding request failed for model/i.test(message)) {
    return 'درخواست embedding به AvalAI ناموفق بود (قطعی موقت شبکه یا API)';
  }
  return message;
}
