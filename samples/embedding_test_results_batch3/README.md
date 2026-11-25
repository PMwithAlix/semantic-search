# Embedding Test — Batch 3

Input: 10 تیکت اول (`title` + `description`)  
Endpoint: `POST https://api.avalai.ir/v1/embeddings`

## Results

| Model | API ID | Status | Dims | Time |
|-------|--------|--------|------|------|
| OpenAI text-embedding-3-large | `text-embedding-3-large` | ✅ ok | 3072 | 2.5s |
| Google gemini-embedding-001 | `gemini-embedding-001` | ✅ ok | 3072 | 1.8s |
| Cohere embed-multilingual-v3 | `cohere.embed-multilingual-v3` | ✅ ok | 1024 | 2.5s |
| NVIDIA nv-embedqa-e5-v5 | `nvidia_nim.nv-embedqa-e5-v5` | ❌ EOL | — | — |

### NVIDIA error
Model reached **end of life** on `2026-08-25` — no longer available on AvalAI NIM.

Alternative on AvalAI: `nvidia_nim.nv-embed-v1`

## Auth-cluster similarity (T-001, T-002, T-004)

| Model | T-001↔T-004 | T-001↔T-002 | T-002↔T-004 | T-001↔T-005 |
|-------|-------------|-------------|-------------|-------------|
| text-embedding-3-large | 0.66 | 0.66 | 0.66 | 0.56 |
| gemini-embedding-001 | 0.88 | 0.90 | 0.89 | 0.70 |
| cohere embed-multilingual-v3 | 0.81 | 0.83 | 0.86 | 0.78 |

**text-embedding-3-large** best separates OAuth (T-005) from auth-loop cluster.  
**gemini-embedding-001** strongest clustering but less discrimination.

## Files
- `{model}.json` — full embeddings
- `{model}_similarity.json` — cosine matrix
- `summary.json`
