# قابلیت‌ها و وضعیت پیاده‌سازی

منبع حقیقت: کد `backend/` و `project/src/`. موارد «برنامه‌ریزی‌شده» از abstractionها و کامنت‌های معماری داخلی استخراج شده‌اند، نه از roadmap جداگانه.

## پیاده‌سازی‌شده

| قابلیت | محل تأیید |
|--------|-----------|
| آپلود CSV، تشخیص encoding/delimiter، استنتاج نوع ستون، پیش‌نمایش | `dataset_service.py` |
| Import ناهمزمان ردیف‌ها به JSONB | Worker + `JobType.IMPORT` |
| کاتالوگ مدل Embedding از `embedding_models.json` | `model_catalog_service.py`، `GET /api/models/embeddings` |
| ساخت متن Embedding با join ستون‌های انتخاب‌شده با `\n` | `text_builder.py` |
| جاب Embedding با batch (پیش‌فرض ۱۰)، retry نمایی، resume روی بردارهای موجود | `processor.py`، `avalai.py` |
| ذخیره بردار در جدول جداگانهٔ `cv_{uuid}` روی pgvector | `vector_store.py` |
| جست‌وجوی معنایی: embed کوئری + Cosine (`<=>`) + امتیاز `1 - distance` | `search_service.py` |
| `top_k` (۱–۱۰۰) و آستانهٔ امتیاز ۰–۱ | `SearchRequest` |
| فیلتر متادیتا: eq, ne, contains, starts_with, gt/gte/lt/lte، empty | `metadata_filters.py` + UI |
| استنتاج محدود intent از Query (کشور مبدأ/مقصد و چند الگوی تماس) | `query_intent.py` |
| متریک زمان embed و vector search در پاسخ | `SearchEvaluationResponse` |
| ذخیره توکن AvalAI رمزنگاری‌شده (Fernet) با fallback به `.env` | `settings_service.py` |
| نرخ تبدیل USD به تومان در تنظیمات (برای نمایش هزینه) | `PUT /api/settings/general` |
| UI صفحات Overview، Datasets، Upload، Import، Embedding، Jobs، Collections، Search، Settings | `App.tsx` |
| زبان FA/EN و RTL | `translations.ts` |
| نقشهٔ نتایج در صورت وجود مختصات (`N`/`E` یا lat/lng) | `SearchResultsMap.tsx` |
| صف جاب: یک جاب فعال، بقیه queued | `processor.py` |
| Docker Compose: db + api + worker | `docker-compose.yml` |
| Migration با Alembic | `backend/alembic/` |

## ناقص یا محدود (وجود دارد اما کامل نیست)

| مورد | توضیح واقعی |
|------|-------------|
| استنتاج Query Intent | فقط الگوهای ازپیش‌تعریف‌شده برای فیلدهایی مثل `Country` و `OtherPartyCountry`؛ برای تیکت پشتیبانی معمولاً فیلتری نمی‌سازد |
| نمایش عنوان نتایج در UI | اولویت با فیلدهای CDR (`IMEI`, `IntelligenceStory`) سپس `title`/`description` |
| `SearchResultRowResponse` در schema | مدل Pydantic بلااستفاده با فیلدهای تیکت؛ پاسخ واقعی `row: dict` است |
| وابستگی `@supabase/supabase-js` در frontend | در `src/` استفاده نمی‌شود |
| برند UI | رشته‌های ترجمه هنوز نام داخلی «VectorForge» را نشان می‌دهند |
| Authentication | CORS محدود به localhost؛ لاگین/RBAC وجود ندارد |
| تست خودکار | فقط `backend/tests/test_query_intent.py`؛ `pytest` در `requirements.txt` نیست |
| ارزیابی recall@k داخل پلتفرم | در API محصول نیست؛ اسکریپت‌ها و JSON نتایج در `samples/` هستند |
| همزمانی Worker | یک جاب در لحظه |

یک تست واحد (`test_manual_filter_overrides_inferred`) با امضای فعلی `merge_metadata_filters` هم‌خوان نیست (dict به‌جای لیست شرط‌ها).

## برنامه‌ریزی‌شده / قابل گسترش از روی abstraction

این موارد در کد به‌صورت interface یا نکتهٔ معماری دیده می‌شوند و **پیاده‌سازی نشده‌اند**:

- Embedding provider غیر از AvalAI (`EmbeddingProviderFactory` فقط AvalAI می‌سازد)
- Vector store غیر از pgvector (Qdrant / Milvus)
- قالب متن Embedding قابل پیکربندی (الان فقط join با خط جدید)
- چند Worker همزمان
- JWT / multi-tenant
- ورودی غیر از CSV
