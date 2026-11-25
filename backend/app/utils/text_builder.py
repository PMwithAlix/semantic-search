def build_embedding_text(row_data: dict, selected_columns: list[str]) -> str:
    parts: list[str] = []
    for column in selected_columns:
        value = row_data.get(column)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            parts.append(text)
    return "\n".join(parts)
