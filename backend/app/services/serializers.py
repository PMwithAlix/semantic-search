from datetime import datetime, timezone

from app.models.entities import Collection, Dataset, DatasetColumn, DatasetRow, Job
from app.schemas.api import ColumnMetadataResponse, CollectionResponse, DatasetResponse, JobResponse, JobTimelineEventResponse


def format_bytes(num: int) -> str:
    if num >= 1024 * 1024:
        return f"{num / (1024 * 1024):.1f} MB"
    if num >= 1024:
        return f"{num / 1024:.1f} KB"
    return f"{num} B"


def serialize_column(column: DatasetColumn, row_count: int) -> ColumnMetadataResponse:
    non_null_percent = (column.non_null_count / row_count * 100) if row_count else 0
    avg_length = len(column.example_value or "")
    return ColumnMetadataResponse(
        name=column.name,
        type=column.inferred_type,
        nonNullPercent=round(non_null_percent, 1),
        uniqueValues=column.unique_count,
        avgLength=float(avg_length),
        exampleValue=column.example_value or "",
        nullCount=max(row_count - column.non_null_count, 0),
    )


def serialize_dataset(dataset: Dataset, preview_rows: list[dict] | None = None) -> DatasetResponse:
    preview = preview_rows or [row.data for row in dataset.rows[:10]]
    return DatasetResponse(
        id=str(dataset.id),
        name=dataset.name,
        fileName=dataset.file_name,
        fileSize=format_bytes(dataset.file_size_bytes),
        fileSizeBytes=dataset.file_size_bytes,
        rowCount=dataset.row_count,
        columnCount=dataset.column_count,
        columns=[serialize_column(column, dataset.row_count) for column in dataset.columns],
        status=dataset.status,
        createdAt=dataset.created_at.date().isoformat(),
        updatedAt=dataset.updated_at.date().isoformat(),
        encoding=dataset.encoding,
        delimiter=dataset.delimiter,
        previewRows=preview,
        destination="PostgreSQL" if dataset.status == "imported" else None,
        database="semantic_search" if dataset.status == "imported" else None,
        tableName=f"dataset_rows/{dataset.id}" if dataset.status == "imported" else None,
    )


def _timeline_for_job(job: Job) -> list[JobTimelineEventResponse]:
    stages = [
        ("queued", "Queued"),
        ("preparing", "Preparing"),
        ("generating", "Generating Embeddings" if job.type == "embedding" else "Importing"),
        ("writing", "Writing Vectors" if job.type == "embedding" else "Writing"),
        ("completed", "Completed"),
    ]
    timeline: list[JobTimelineEventResponse] = []
    order = [stage for stage, _ in stages]
    current_idx = order.index(job.stage) if job.stage in order else 0
    for idx, (stage, label) in enumerate(stages):
        if job.status == "failed" and stage == job.stage:
            status = "failed"
        elif idx < current_idx or job.status == "completed":
            status = "done"
        elif idx == current_idx and job.status in {"running", "queued"}:
            status = "current" if job.status == "running" else "pending"
        else:
            status = "pending"
        timeline.append(JobTimelineEventResponse(stage=stage, label=label, status=status))
    return timeline


def serialize_job(job: Job, dataset_name: str, model_name: str = "", provider: str = "", dimensions: int = 0) -> JobResponse:
    started = job.started_at or job.created_at
    elapsed = int((datetime.now(timezone.utc) - started.replace(tzinfo=timezone.utc)).total_seconds()) if started else 0
    remaining = 0
    if job.progress > 0 and job.progress < 100:
        remaining = int(elapsed * (100 - job.progress) / max(job.progress, 1))
    rate = int(job.rows_processed / max(elapsed, 1)) if elapsed else 0
    return JobResponse(
        id=str(job.id),
        type=job.type,
        datasetId=str(job.dataset_id),
        datasetName=dataset_name,
        modelId=job.model_id or "",
        modelName=model_name,
        provider=provider,
        dimensions=dimensions,
        selectedColumns=job.selected_columns or [],
        status=job.status,
        stage=job.stage,
        progress=round(job.progress, 2),
        rowsTotal=job.rows_total,
        rowsProcessed=job.rows_processed,
        rowsSuccessful=job.rows_successful,
        rowsFailed=job.rows_failed,
        processingRate=rate,
        startedAt=started.isoformat() if started else job.created_at.isoformat(),
        elapsedSeconds=elapsed,
        estimatedRemainingSeconds=remaining,
        duration=f"{elapsed}s",
        timeline=_timeline_for_job(job),
        vectorCollectionId=str(job.collection_id) if job.collection_id else None,
        errorMessage=job.error_message,
    )


def serialize_collection(
    collection: Collection,
    dataset_name: str,
    dataset_columns: list[DatasetColumn] | None = None,
) -> CollectionResponse:
    storage_bytes = (collection.vector_count * (collection.dimensions or 0) * 4) if collection.dimensions else 0
    if dataset_columns:
        metadata_schema = [
            {"field": column.name, "type": column.inferred_type} for column in dataset_columns
        ]
    else:
        metadata_schema = [{"field": column, "type": "string"} for column in collection.selected_columns]
    return CollectionResponse(
        id=str(collection.id),
        name=collection.name,
        datasetId=str(collection.dataset_id),
        datasetName=dataset_name,
        modelId=collection.model_id,
        modelName=collection.model_name,
        provider=collection.provider,
        dimensions=collection.dimensions or 0,
        vectorCount=collection.vector_count,
        distanceMetric=collection.distance_metric,
        status=collection.status,
        createdAt=collection.created_at.date().isoformat(),
        storageSize=format_bytes(storage_bytes),
        storageBytes=storage_bytes,
        vectorDb="pgvector",
        indexedFields=list(collection.selected_columns),
        sourceColumns=list(collection.selected_columns),
        metadataSchema=metadata_schema,
    )
