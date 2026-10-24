# Decisions

- Phase 1 uses Node 20's built-in `--watch` mode for development, avoiding an additional development dependency.
- Taxonomy is loaded as JSON from `server/src/taxonomy/rrb-ntpc.taxonomy.json` and exposed by a small loader service; the taxonomy contents remain editable data.
- The client package is initialized with the Phase 1 fixed-stack dependencies and a minimal Vite entry point so the required project structure is usable. Client features remain out of scope until their phase.
- Phase 2 renders the original PDF directly with `pdf-to-img` 4.x at 150 DPI; this avoids a temporary split-file pipeline and keeps Node 20 compatibility.
- Paper metadata is required on upload (`examKey`, `title`, `examDate`, `shift`) and `examKey` must match a seeded ExamProfile.
- Phase 3 stores one-based failed chunk IDs in `progress.failedChunks` and missing question numbers in `extractionStats.missingQNos`, allowing resume and polling without keeping job state only in memory.
- Tagging results are paired with the supplied question batch by array order because the fixed Section 10.4 prompt has no question identifier in its response fields.
- `EXTRACTION_CONCURRENCY` limits simultaneous paper jobs; chunks within a paper run sequentially to keep overlap deduplication and per-chunk progress updates deterministic.

- Local server/.env uses gemini-3.8-flash for sample validation because the configured Gemini API key returned 404 for the PROJECT.md default gemini-2.5-flash (not available to new users). The checked-in .env.example keeps the PROJECT.md default unchanged.
- Phase 5 blueprint edits accept weighted subcategory counts and use largest-remainder allocation to preserve each ExamProfile section total; a section with no observed tags gets an `Other` leaf.
- Phase 6 custom mock input uses `sections: [{ name, subcategories: [{ category, subcategory, count }] }]`, the simplest explicit shape compatible with the API's `sections?` field.
- Phase 7 uses a short authored `generate.prompt.js` because PROJECT.md specifies the generation/independent-solve behavior but no literal generation prompt. Each accepted generated question must have matching answers from two separate calls through `gemini.service.js`; it remains unverified and flagged for review.
- AI-generated questions use the next exam-wide qNo after the current maximum because the existing Question model requires qNo but has no generated-question identifier; their `origin` distinguishes them from source-paper questions.
- Phase 8 bilingual display filters newline-separated text by Devanagari or Latin script because the fixed Question schema stores one `text` and one `options` set rather than separate translations. Mixed-script lines remain intact.
- Result PDF export uses pdf-lib's built-in fonts (already in the fixed stack); non-Latin characters are replaced with `?` so exports remain valid PDFs without adding a font package.
