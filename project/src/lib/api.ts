import type {
  Dataset,
  EmbeddingJob,
  EmbeddingModel,
  SearchEvaluation,
  SearchIntent,
  SearchResult,
  VectorCollection,
} from '@/types';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface SettingsStatus {
  avalai_configured: boolean;
  usd_to_toman?: number | null;
}

export const api = {
  getSettingsStatus: () => request<SettingsStatus>('/settings/status'),
  saveToken: (api_key: string) =>
    request<SettingsStatus>('/settings/token', {
      method: 'PUT',
      body: JSON.stringify({ api_key }),
    }),
  clearToken: () => request<SettingsStatus>('/settings/token', { method: 'DELETE' }),
  saveGeneralSettings: (payload: { usd_to_toman?: number | null }) =>
    request<SettingsStatus>('/settings/general', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  listEmbeddingModels: () => request<EmbeddingModel[]>('/models/embeddings'),

  listDatasets: () => request<Dataset[]>('/datasets'),
  getDataset: (id: string) => request<Dataset>(`/datasets/${id}`),
  uploadDataset: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/datasets/upload', { method: 'POST', body: form });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new ApiError(payload.detail ?? 'Upload failed', response.status);
    }
    return response.json() as Promise<Dataset>;
  },
  deleteDataset: (id: string) => request<void>(`/datasets/${id}`, { method: 'DELETE' }),
  createImportJob: (dataset_id: string) =>
    request<EmbeddingJob>('/datasets/import-jobs', {
      method: 'POST',
      body: JSON.stringify({ dataset_id }),
    }),

  listJobs: () => request<EmbeddingJob[]>('/jobs'),
  getJob: (id: string) => request<EmbeddingJob>(`/jobs/${id}`),
  createEmbeddingJob: (payload: { dataset_id: string; model_id: string; selected_columns: string[] }) =>
    request<EmbeddingJob>('/jobs/embedding', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resumeJob: (job_id: string) =>
    request<EmbeddingJob>(`/jobs/${job_id}/resume`, { method: 'POST' }),

  listCollections: () => request<VectorCollection[]>('/collections'),
  getCollection: (id: string) => request<VectorCollection>(`/collections/${id}`),

  search: (payload: {
    collection_id: string;
    query: string;
    top_k: number;
    threshold: number;
    metadata_filters?: Array<{ field: string; operator: string; value: string; field_type?: string }>;
  }) =>
    request<{ results: SearchResult[]; evaluation: SearchEvaluation; intent?: SearchIntent }>('/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export { ApiError };
