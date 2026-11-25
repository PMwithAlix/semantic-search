import hashlib
import re


def slugify(value: str, max_length: int = 80) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", value.strip().lower())
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug[:max_length] or "item"


def collection_name(dataset_name: str, model_id: str, selected_columns: list[str]) -> tuple[str, str]:
    columns_part = "_".join(slugify(column) for column in selected_columns)
    columns_hash = hashlib.sha1(",".join(selected_columns).encode("utf-8")).hexdigest()[:8]
    base = slugify(dataset_name.replace(".csv", ""))
    model = slugify(model_id)
    name = f"{base}__{model}__{columns_hash}"
    display = f"{base} ({model}, {columns_part})"
    return name[:120], display[:200]
