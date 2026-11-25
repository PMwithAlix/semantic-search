export type Language = 'en' | 'fa';

export type DatasetStatus =
  | 'uploaded'
  | 'validating'
  | 'ready'
  | 'importing'
  | 'imported'
  | 'error';

export type ColumnType = 'string' | 'integer' | 'float' | 'boolean' | 'datetime' | 'time' | 'text';

export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  nonNullPercent: number;
  uniqueValues: number;
  avgLength: number;
  exampleValue: string;
  nullCount: number;
}

export interface DatasetRow {
  [key: string]: string | number | boolean | null;
}

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  fileSize: string;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnMetadata[];
  status: DatasetStatus;
  createdAt: string;
  updatedAt: string;
  encoding: string;
  delimiter: string;
  previewRows: DatasetRow[];
  embeddingModel?: string;
  destination?: string;
  database?: string;
  tableName?: string;
}

export type EmbeddingModelStatus = 'available' | 'recommended' | 'beta' | 'deprecated';

export interface EmbeddingModel {
  id: string;
  name: string;
  display_name?: string;
  provider: string;
  dimensions?: number | null;
  latency?: string;
  latencyMs?: number;
  price?: string;
  pricePerMillion?: number;
  pricing?: Record<string, number>;
  languages?: string[];
  status?: EmbeddingModelStatus | string;
  useCase?: string;
  qualityScore?: number;
  max_tokens?: number | null;
  max_input_tokens?: number | null;
  supported_endpoints?: string[];
  tier_rate_limits?: Record<string, unknown>;
  mode?: string;
}

export interface EmbeddingConfiguration {
  datasetId: string;
  modelId: string;
  selectedColumns: string[];
  inputTemplate: string;
  estimatedRows: number;
  estimatedTokens: number;
  estimatedCost: number;
  estimatedStorageMB: number;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type JobType = 'embedding' | 'import' | 'search';
export type JobStage = 'queued' | 'preparing' | 'generating' | 'writing' | 'completed';

export interface JobTimelineEvent {
  stage: JobStage;
  label: string;
  status: 'done' | 'current' | 'pending' | 'failed';
  timestamp?: string;
}

export interface EmbeddingJob {
  id: string;
  type: JobType;
  datasetId: string;
  datasetName: string;
  modelId: string;
  modelName: string;
  provider: string;
  dimensions: number;
  selectedColumns: string[];
  status: JobStatus;
  stage: JobStage;
  progress: number;
  rowsTotal: number;
  rowsProcessed: number;
  rowsSuccessful: number;
  rowsFailed: number;
  processingRate: number;
  startedAt: string;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  duration: string;
  timeline: JobTimelineEvent[];
  vectorCollectionId?: string;
  errorMessage?: string;
}

export type VectorDbProvider = 'pgvector' | 'qdrant' | 'milvus' | 'pinecone' | 'weaviate' | 'opensearch' | 'elasticsearch';
export type DistanceMetric = 'cosine' | 'euclidean' | 'dot' | 'manhattan';
export type CollectionStatus = 'ready' | 'building' | 'error' | 'degraded';

export interface VectorCollection {
  id: string;
  name: string;
  datasetId: string;
  datasetName: string;
  modelId: string;
  modelName: string;
  provider: string;
  dimensions: number;
  vectorCount: number;
  distanceMetric: DistanceMetric;
  status: CollectionStatus;
  createdAt: string;
  storageSize: string;
  storageBytes: number;
  vectorDb: VectorDbProvider;
  indexedFields: string[];
  sourceColumns: string[];
  metadataSchema: { field: string; type: string }[];
}

export interface SearchQuery {
  collectionId: string;
  query: string;
  topK: number;
  threshold: number;
  datasetFilter?: string;
}

export interface SearchResultRow {
  ticketId?: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
  category?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface SearchResult {
  rank: number;
  score: number;
  row: Record<string, string | number | boolean | null>;
  metadata: Record<string, string>;
  embeddingText: string;
}

export interface SearchEvaluation {
  queryEmbeddingMs: number;
  vectorSearchMs: number;
  totalMs: number;
  modelUsed: string;
  collectionUsed: string;
}

export interface SearchIntent {
  appliedFilters: Record<string, string>;
  inferredFilters: Record<string, string>;
  filterMatchCount: number;
  strictFilterApplied: boolean;
  intentReasons: string[];
}

export interface DatabaseProviderInfo {
  id: VectorDbProvider;
  name: string;
  description: string;
  connected: boolean;
  features: string[];
}

export interface KPI {
  labelKey: string;
  value: string;
  icon: string;
  trend?: string;
}
