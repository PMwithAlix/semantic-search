# Embedding Test — Batch 2

## وضعیت: ❌ مدل‌ها در AvalAI موجود نیستند

تاریخ تست: 2026-09-12  
Endpoint: `POST https://api.avalai.ir/v1/embeddings`  
Input: 10 تیکت اول (`title` + `description`) — `input_samples.json`

## مدل‌های درخواستی

| # | مدل | وضعیت | IDs امتحان‌شده |
|---|-----|--------|----------------|
| 1 | Qwen3-Embedding-8B | ❌ not found | `qwen3-embedding-8b`, `qwen3-embedding-8b-instruct`, ... |
| 2 | Voyage 4 | ❌ not found | `voyage-4`, `voyage-4-large`, `voyage-4-lite` |
| 2b | Voyage 3.5-large | ❌ not found | `voyage-3.5-large`, `voyage-3.5`, ... |
| 3 | Jina Embeddings v5-text | ❌ not found | `jina-embeddings-v5-text-small`, `jina-embeddings-v5-text`, ... |
| 4 | KaLM-Embedding-Gemma3-12B | ❌ not found | `KaLM-Embedding-Gemma3-12B`, `kalm-embedding-gemma3-12b`, ... |
| 5 | BGE-M3 | ❌ not found | `bge-m3`, `BAAI/bge-m3`, ... |

## پاسخ API

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Requested resource ... does not exist."
  }
}
```

## Embedding models موجود در AvalAI (16 مدل)

| Model ID | Provider |
|----------|----------|
| `embed-v-4-0` | Cohere |
| `gemini-embedding-2` | Google |
| `text-embedding-v4` | Alibaba |
| `text-embedding-v3` | Alibaba |
| `text-embedding-3-large` | OpenAI |
| `cohere.embed-multilingual-v3` | Cohere |
| `nvidia_nim.nv-embed-v1` | NVIDIA |
| ... | (see `embedding_models.json`) |

## فایل‌ها

- `summary.json` — خلاصه تست‌ها
- `{model_label}.json` — جزئیات خطا برای هر مدل
- `input_samples.json` — ورودی 10 تیکت

## گام بعدی

برای تست این 5 مدل نیاز به یکی از این‌هاست:
1. **Provider دیگر** (HuggingFace Inference, Jina API, Voyage AI, ...)
2. **Self-host** با Ollama/vLLM
3. **درخواست فعال‌سازی** از AvalAI support
