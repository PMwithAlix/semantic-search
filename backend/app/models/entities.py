import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DatasetStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    READY = "ready"
    IMPORTING = "importing"
    IMPORTED = "imported"
    ERROR = "error"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobStage(str, enum.Enum):
    QUEUED = "queued"
    PREPARING = "preparing"
    GENERATING = "generating"
    WRITING = "writing"
    COMPLETED = "completed"


class JobType(str, enum.Enum):
    IMPORT = "import"
    EMBEDDING = "embedding"


class CollectionStatus(str, enum.Enum):
    BUILDING = "building"
    READY = "ready"
    ERROR = "error"


class EncryptedSetting(Base):
    __tablename__ = "encrypted_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    stored_file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default=DatasetStatus.UPLOADED.value)
    encoding: Mapped[str] = mapped_column(String(64), default="utf-8")
    delimiter: Mapped[str] = mapped_column(String(8), default=",")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    columns: Mapped[list["DatasetColumn"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")
    rows: Mapped[list["DatasetRow"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")
    jobs: Mapped[list["Job"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")
    collections: Mapped[list["Collection"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"
    __table_args__ = (UniqueConstraint("dataset_id", "name", name="uq_dataset_column_name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    inferred_type: Mapped[str] = mapped_column(String(32), default="string")
    non_null_count: Mapped[int] = mapped_column(Integer, default=0)
    unique_count: Mapped[int] = mapped_column(Integer, default=0)
    example_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    dataset: Mapped["Dataset"] = relationship(back_populates="columns")


class DatasetRow(Base):
    __tablename__ = "dataset_rows"
    __table_args__ = (UniqueConstraint("dataset_id", "row_number", name="uq_dataset_row_number"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"))
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    dataset: Mapped["Dataset"] = relationship(back_populates="rows")


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"))
    model_id: Mapped[str] = mapped_column(String(256), nullable=False)
    model_name: Mapped[str] = mapped_column(String(256), nullable=False)
    provider: Mapped[str] = mapped_column(String(128), nullable=False)
    dimensions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    selected_columns: Mapped[list] = mapped_column(JSONB, nullable=False)
    columns_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    distance_metric: Mapped[str] = mapped_column(String(32), default="cosine")
    status: Mapped[str] = mapped_column(String(32), default=CollectionStatus.BUILDING.value)
    vector_count: Mapped[int] = mapped_column(Integer, default=0)
    vector_table_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    dataset: Mapped["Dataset"] = relationship(back_populates="collections")
    jobs: Mapped[list["Job"]] = relationship(back_populates="collection")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"))
    collection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collections.id", ondelete="SET NULL"), nullable=True
    )
    model_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    selected_columns: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=JobStatus.QUEUED.value)
    stage: Mapped[str] = mapped_column(String(32), default=JobStage.QUEUED.value)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    rows_total: Mapped[int] = mapped_column(Integer, default=0)
    rows_processed: Mapped[int] = mapped_column(Integer, default=0)
    rows_successful: Mapped[int] = mapped_column(Integer, default=0)
    rows_failed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    dataset: Mapped["Dataset"] = relationship(back_populates="jobs")
    collection: Mapped["Collection | None"] = relationship(back_populates="jobs")
