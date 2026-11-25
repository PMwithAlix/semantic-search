"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-09-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "encrypted_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key_name", sa.String(length=128), nullable=False),
        sa.Column("encrypted_value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_encrypted_settings_key_name", "encrypted_settings", ["key_name"], unique=True)

    op.create_table(
        "datasets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("file_name", sa.String(length=512), nullable=False),
        sa.Column("stored_file_path", sa.String(length=1024), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("column_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("encoding", sa.String(length=64), nullable=False),
        sa.Column("delimiter", sa.String(length=8), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "dataset_columns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("inferred_type", sa.String(length=32), nullable=False),
        sa.Column("non_null_count", sa.Integer(), nullable=False),
        sa.Column("unique_count", sa.Integer(), nullable=False),
        sa.Column("example_value", sa.Text(), nullable=True),
        sa.UniqueConstraint("dataset_id", "name", name="uq_dataset_column_name"),
    )

    op.create_table(
        "dataset_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.UniqueConstraint("dataset_id", "row_number", name="uq_dataset_row_number"),
    )

    op.create_table(
        "collections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=512), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=512), nullable=False),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model_id", sa.String(length=256), nullable=False),
        sa.Column("model_name", sa.String(length=256), nullable=False),
        sa.Column("provider", sa.String(length=128), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=True),
        sa.Column("selected_columns", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("columns_hash", sa.String(length=64), nullable=False),
        sa.Column("distance_metric", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("vector_count", sa.Integer(), nullable=False),
        sa.Column("vector_table_name", sa.String(length=128), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("collection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("collections.id", ondelete="SET NULL"), nullable=True),
        sa.Column("model_id", sa.String(length=256), nullable=True),
        sa.Column("selected_columns", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("progress", sa.Float(), nullable=False),
        sa.Column("rows_total", sa.Integer(), nullable=False),
        sa.Column("rows_processed", sa.Integer(), nullable=False),
        sa.Column("rows_successful", sa.Integer(), nullable=False),
        sa.Column("rows_failed", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("collections")
    op.drop_table("dataset_rows")
    op.drop_table("dataset_columns")
    op.drop_table("datasets")
    op.drop_index("ix_encrypted_settings_key_name", table_name="encrypted_settings")
    op.drop_table("encrypted_settings")
