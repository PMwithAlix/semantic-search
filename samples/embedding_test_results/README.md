# Embedding Test — 10 Sample Tickets

## Input
- Source: `customer_support_tickets_200.csv` rows T-001 .. T-010
- Fields used: `title` + `description` (concatenated)
- Saved in: `input_samples.json`

## Models
| File | Model ID |
|------|----------|
| `cohere_embed_v4.json` | `embed-v-4-0` |
| `gemini_embedding.json` | `gemini-embedding-2` |
| `text_embedding_v4.json` | `text-embedding-v4` |
| `text_embedding_v3.json` | `text-embedding-v3` |

## Run
```powershell
$env:AVALAI_API_KEY = "YOUR_KEY"
python run_embedding_test.py
python compare_embeddings.py
```

## Manual evaluation hints
Compare similarity matrices (`*_similarity.json`):
- **T-001, T-002, T-004** = same auth-loop concept → high cosine
- **T-005** = Google OAuth → should rank lower vs T-001
- **T-006** = OTP → partially related to auth
- **T-008** = 403 after login → related but distinct

Best model = clusters semantically similar tickets without keyword overlap.
