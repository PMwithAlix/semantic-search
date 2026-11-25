from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SettingsStatusResponse(BaseModel):
    avalai_configured: bool
    usd_to_toman: float | None = None


class SettingsTokenRequest(BaseModel):
    api_key: str = Field(min_length=8)


class SettingsGeneralRequest(BaseModel):
    usd_to_toman: float | None = Field(default=None, ge=0)


class MetadataFilterCondition(BaseModel):
    field: str = Field(min_length=1)
    operator: str = Field(default="eq")
    value: str = ""
    field_type: str | None = None


class EmbeddingModelResponse(BaseModel):
    id: str
    name: str
    display_name: str
    provider: str
    mode: str | None = None
    pricing: dict | None = None
    max_tokens: int | None = None
    max_input_tokens: int | None = None
    supported_endpoints: list[str] = []
    tier_rate_limits: dict | None = None
    status: str = "available"
    dimensions: int | None = None


class ColumnMetadataResponse(BaseModel):
    name: str
    type: str
    nonNullPercent: float
    uniqueValues: int
    avgLength: float
    exampleValue: str
    nullCount: int


class DatasetResponse(BaseModel):
    id: str
    name: str
    fileName: str
    fileSize: str
    fileSizeBytes: int
    rowCount: int
    columnCount: int
    columns: list[ColumnMetadataResponse]
    status: str
    createdAt: str
    updatedAt: str
    encoding: str
    delimiter: str
    previewRows: list[dict]
    embeddingModel: str | None = None
    destination: str | None = None
    database: str | None = None
    tableName: str | None = None


class JobTimelineEventResponse(BaseModel):
    stage: str
    label: str
    status: str
    timestamp: str | None = None


class JobResponse(BaseModel):
    id: str
    type: str
    datasetId: str
    datasetName: str
    modelId: str
    modelName: str
    provider: str
    dimensions: int
    selectedColumns: list[str]
    status: str
    stage: str
    progress: float
    rowsTotal: int
    rowsProcessed: int
    rowsSuccessful: int
    rowsFailed: int
    processingRate: float
    startedAt: str
    elapsedSeconds: int
    estimatedRemainingSeconds: int
    duration: str
    timeline: list[JobTimelineEventResponse]
    vectorCollectionId: str | None = None
    errorMessage: str | None = None


class CollectionResponse(BaseModel):
    id: str
    name: str
    datasetId: str
    datasetName: str
    modelId: str
    modelName: str
    provider: str
    dimensions: int
    vectorCount: int
    distanceMetric: str
    status: str
    createdAt: str
    storageSize: str
    storageBytes: int
    vectorDb: str
    indexedFields: list[str]
    sourceColumns: list[str]
    metadataSchema: list[dict[str, str]]


class CreateImportJobRequest(BaseModel):
    dataset_id: UUID


class CreateEmbeddingJobRequest(BaseModel):
    dataset_id: UUID
    model_id: str
    selected_columns: list[str] = Field(min_length=1)


class SearchRequest(BaseModel):
    collection_id: UUID
    query: str = Field(min_length=1)
    top_k: int = Field(default=10, ge=1, le=100)
    threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    metadata_filters: list[MetadataFilterCondition] | None = None


class SearchResultRowResponse(BaseModel):
    ticketId: str
    title: str
    description: str
    priority: str
    status: str
    createdAt: str
    category: str


class SearchResultResponse(BaseModel):
    rank: int
    score: float
    row: dict
    metadata: dict[str, str]
    embeddingText: str


class SearchEvaluationResponse(BaseModel):
    queryEmbeddingMs: float
    vectorSearchMs: float
    totalMs: float
    modelUsed: str
    collectionUsed: str


class SearchIntentResponse(BaseModel):
    appliedFilters: dict[str, str] = Field(default_factory=dict)
    inferredFilters: dict[str, str] = Field(default_factory=dict)
    filterMatchCount: int = 0
    strictFilterApplied: bool = False
    intentReasons: list[str] = Field(default_factory=list)


class SearchResponse(BaseModel):
    results: list[SearchResultResponse]
    evaluation: SearchEvaluationResponse
    intent: SearchIntentResponse | None = None
