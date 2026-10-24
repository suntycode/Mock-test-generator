# PROJECT.md — AI Mock Test Generator (Single Source of Truth)

> **How to use this file with an LLM:** Paste this entire file into your coding LLM (Claude Code, Cursor, etc.) and say:
> *"Read PROJECT.md fully. Implement Phase 1 exactly as specified. Do not invent features outside this file. After each phase, stop and show me how to run and test it."*
> Then continue phase by phase (see Section 16).

---

## 1. Project Summary

A web app where I upload previous-year exam papers (PDF). The app uses **Google Gemini** to extract every question, tag it (section, subject, category, subcategory, difficulty), find the correct answer, and store it in a **question bank**. It then **analyzes** how many questions each subject/subcategory/difficulty has, builds a **blueprint** (exam pattern), and **generates new mock tests** matching that pattern. The test-taking screen behaves like the **real exam** (server-authoritative timer, question palette, section tabs, negative marking, auto-submit).

**First use case (personal):** RRB NTPC Undergraduate CBT-II (bilingual, Hindi/English).
**Design goal:** Works for any MCQ exam later (SSC, Banking, etc.) by changing the *Exam Profile*, not the code.

### Non-goals for v1
- No user registration/login (single local user). Add auth in Phase 8.
- No payments, no cloud deployment, no multi-tenant.
- No republishing uploaded papers; the PDFs stay on my machine.

---

## 2. Tech Stack (fixed — do not change)

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Backend | Express 4, JavaScript (ES Modules) |
| Database | MongoDB (local, `mongodb://127.0.0.1:27017/mocktest`) with Mongoose 8 |
| Frontend | React 18 + Vite, React Router, Zustand (state), Axios, TailwindCSS v3 + shadcn/ui (Radix primitives, CVA, clsx, tailwind-merge, Lucide icons, Sonner toasts, Recharts, Inter & Noto Sans Devanagari fonts) |
| LLM | Multi-tier cascade with auto-failover on quota/credit limit (429/RESOURCE_EXHAUSTED):<br>1. Primary: Google Gemini via `@google/genai` (`gemini-3.8-flash` / `gemini-2.5-flash`)<br>2. Secondary: Groq / xAI Grok (`qwen/qwen3.8-27b` / `grok-2-vision-1212`)<br>3. Tertiary: NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`) |
| PDF handling | `multer` (upload), `pdf-lib` (split pages), `pdf-to-img` or `pdftoppm` (page → PNG), `sharp` (crop/resize) |
| Math rendering | `katex` + `react-katex` (questions store LaTeX) |
| Validation | `zod` |
| Logging | `pino` |
| File storage | Local disk under `/storage` (not in git) |

---

## 3. Folder Structure

```
mocktest/
├─ PROJECT.md
├─ .gitignore                 # node_modules, .env, storage/
├─ server/
│  ├─ package.json            # "type": "module"
│  ├─ .env.example
│  └─ src/
│     ├─ index.js             # boot: connect DB, start express
│     ├─ app.js               # express app, middlewares, routes
│     ├─ config/env.js        # zod-validated env
│     ├─ db/connect.js
│     ├─ models/
│     │  ├─ ExamProfile.js
│     │  ├─ Paper.js
│     │  ├─ Question.js
│     │  ├─ Blueprint.js
│     │  ├─ MockTest.js
│     │  └─ Attempt.js
│     ├─ routes/
│     │  ├─ papers.routes.js
│     │  ├─ questions.routes.js
│     │  ├─ analytics.routes.js
│     │  ├─ mocktests.routes.js
│     │  └─ attempts.routes.js
│     ├─ controllers/         # thin: parse req → call service → respond
│     ├─ services/
│     │  ├─ gemini.service.js         # Gemini calls with auto-failover to Groq & NVIDIA NIM
│     │  ├─ grok.service.js           # Groq / xAI Grok fallback vision & text service
│     │  ├─ nvidia.service.js         # NVIDIA NIM fallback vision & text service
│     │  ├─ extraction.service.js     # PDF → chunks → Gemini → validated questions
│     │  ├─ taxonomy.service.js       # normalizes tags against fixed taxonomy
│     │  ├─ analytics.service.js      # counts + blueprint build
│     │  ├─ generator.service.js      # picks questions for a mock
│     │  ├─ scoring.service.js
│     │  └─ difficulty.service.js     # recalibration from attempts
│     ├─ prompts/
│     │  ├─ extract.prompt.js
│     │  ├─ tag.prompt.js
│     │  └─ generate.prompt.js        # phase 7
│     ├─ taxonomy/rrb-ntpc.taxonomy.json
│     ├─ utils/ (pdf.js, image.js, retry.js, errors.js)
│     └─ middleware/ (error.js, upload.js)
├─ client/
│  ├─ package.json
│  └─ src/
│     ├─ main.jsx, App.jsx
│     ├─ api/client.js
│     ├─ store/ (examStore.js)
│     ├─ pages/
│     │  ├─ Dashboard.jsx
│     │  ├─ UploadPaper.jsx
│     │  ├─ ReviewQuestions.jsx
│     │  ├─ Analytics.jsx
│     │  ├─ CreateMock.jsx
│     │  ├─ Instructions.jsx
│     │  ├─ ExamScreen.jsx
│     │  └─ Result.jsx
│     └─ components/
│        ├─ exam/ (Timer, QuestionPanel, Palette, SectionTabs, ActionBar, SubmitModal)
│        ├─ MathText.jsx      # renders text + LaTeX
│        └─ common/
└─ storage/                   # created at runtime
   ├─ papers/<paperId>/original.pdf
   ├─ papers/<paperId>/pages/page-001.png ...
   └─ papers/<paperId>/figures/<questionId>.png
```

---

## 4. Environment Variables (`server/.env`)

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/mocktest
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
GROK_API_KEY=your_groq_or_xai_key_here
GROK_MODEL=qwen/qwen3.8-27b
NAVIDIA_KEY=your_nvidia_nim_key_here
NVIDIA_API_KEY=your_nvidia_nim_key_here
NVIDIA_VISION_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_TEXT_MODEL=meta/llama-3.2-11b-vision-instruct
STORAGE_DIR=../storage
PAGES_PER_CHUNK=6
EXTRACTION_CONCURRENCY=2
CLIENT_ORIGIN=http://localhost:5173
```

Client: `VITE_API_URL=http://localhost:5000/api`

---

## 5. Facts About the Sample Paper (design must handle these)

Source: *RRB NTPC Undergraduate CBT II, 17/09/2026, 9:30–11:00 AM, iON Digital Zone.*

| Item | Value |
|---|---|
| Total questions | **120** |
| Sections | General Awareness **Q1–50**, Mathematics **Q51–85** (35), General Intelligence & Reasoning **Q86–120** (35) |
| Marking | **+1 correct, −1/3 wrong**, unattempted = 0 |
| Duration | **90 minutes** |
| Language | Hindi (some questions in English, e.g., Q14) |
| Options | 4 (A–D) |

**Known extraction problems (critical):**
1. **Plain-text extraction is unreliable.** Hindi text is garbled in places (e.g., Q5–Q13 have broken conjuncts), and **math formulas/figures are blank** (e.g., Q51, Q54, Q73, Q74, Q77).
2. **Correct answers are NOT in the text.** They appear only as *green-colored options with a tick icon* (per the paper's own note). They must be read **visually**.
3. A "Chosen option" marker may also exist (candidate's selection) — **ignore it**; only the green tick means correct.
4. Question numbers restart per paper; some questions span page breaks.
5. Some questions are visually broken in the source (e.g., Q41 option C on a separate line).

**Therefore: the pipeline MUST send PDF pages/page-images to Gemini (vision), never raw extracted text.**

---

## 6. Exam Profile (config, stored in DB; seeded on first run)

```json
{
  "key": "rrb-ntpc-ug-cbt2",
  "name": "RRB NTPC Undergraduate CBT-II",
  "durationMinutes": 90,
  "totalQuestions": 120,
  "marking": { "correct": 1, "wrong": -0.3333333333 , "unattempted": 0 },
  "sections": [
    { "name": "General Awareness", "questions": 50, "order": 1 },
    { "name": "Mathematics", "questions": 35, "order": 2 },
    { "name": "General Intelligence and Reasoning", "questions": 35, "order": 3 }
  ],
  "sectionLock": false,
  "optionsPerQuestion": 4,
  "languages": ["hi", "en"]
}
```
`sectionLock: false` = candidate can move freely between sections (as in this exam).

---

## 7. Fixed Taxonomy (`taxonomy/rrb-ntpc.taxonomy.json`)

Gemini MUST pick tags only from this list. Anything else is mapped to `Other` and flagged `needsReview`.

```json
{
  "General Awareness": {
    "History": ["Ancient India", "Medieval India", "Modern India", "World History"],
    "Polity and Constitution": ["Constitutional Provisions", "Amendments", "Parliament and Governance", "Acts and Laws", "Judiciary"],
    "Geography": ["Indian Geography", "World Geography", "Physical Geography", "Agriculture", "Minerals and Resources"],
    "Economy": ["Indian Economy", "Budget and Schemes", "Banking and Finance"],
    "General Science": ["Physics", "Chemistry", "Biology"],
    "Computer Awareness": ["Fundamentals", "Networking", "Software and Shortcuts", "Abbreviations"],
    "Sports": ["Tournaments and Trophies", "Rules and Terminology"],
    "Current Affairs": ["National", "International", "Defence", "Awards and Reports", "Schemes and Policies", "Science and Tech"],
    "Static GK": ["Art and Culture", "Books and Authors", "Miscellaneous"]
  },
  "Mathematics": {
    "Arithmetic": ["Percentage", "Profit and Loss", "Simple Interest", "Compound Interest", "Ratio and Proportion", "Average", "Time and Work", "Time Speed Distance", "Partnership", "Mixture and Alligation", "Discount"],
    "Number System": ["LCM and HCF", "Simplification", "Divisibility", "Prime Factors", "BODMAS", "Remainders"],
    "Algebra": ["Linear Equations", "Quadratic Equations", "Identities", "Surds and Indices"],
    "Geometry": ["Lines and Angles", "Triangles", "Circles", "Quadrilaterals"],
    "Mensuration": ["2D", "3D"],
    "Trigonometry": ["Ratios and Identities", "Heights and Distances"],
    "Statistics and Data": ["Mean Median Mode", "Variance", "Data Interpretation"]
  },
  "General Intelligence and Reasoning": {
    "Verbal Reasoning": ["Analogy", "Classification (Odd One Out)", "Series (Number)", "Series (Alphabet)", "Coding-Decoding", "Letter Cluster Pairs", "Blood Relations", "Direction and Distance", "Ranking and Order", "Seating Arrangement", "Box and Stacking Arrangement", "Mathematical Operations (Symbols)", "Data Sufficiency", "Syllogism", "Venn Diagram", "Counting Symbols/Numbers"],
    "Non-Verbal Reasoning": ["Figure Series", "Mirror and Water Image", "Paper Folding", "Embedded Figures"]
  }
}
```
Structure is `Section → Category → [Subcategories]`. **Subject = Section name** (`General Awareness`, `Mathematics`, `Reasoning`). Taxonomy is editable by me; code must read it from the JSON file, never hard-code.

**Examples from the sample paper:** Q1 → GA / General Science / Chemistry. Q20 → GA / Polity and Constitution / Amendments. Q59 (LCM of 3,77,33) → Maths / Number System / LCM and HCF. Q62 → Maths / Arithmetic / Simple Interest. Q88 (EKP GMR IOT…) → Reasoning / Verbal / Series (Alphabet).

---

## 8. Data Models (Mongoose)

### ExamProfile
As in Section 6, plus `createdAt`.

### Paper
```js
{
  examKey: String,            // "rrb-ntpc-ug-cbt2"
  title: String,              // "RRB NTPC UG CBT-II 17-Sep-2026 Shift 1"
  examDate: Date,
  shift: String,
  originalFilename: String,
  pdfPath: String,            // storage/papers/<id>/original.pdf
  totalPages: Number,
  status: "uploaded" | "extracting" | "extracted" | "review" | "approved" | "failed",
  progress: { chunksTotal: Number, chunksDone: Number },
  extractionStats: { found: Number, expected: Number, needsReview: Number },
  error: String,
  createdAt, updatedAt
}
```

### Question
```js
{
  paperId: ObjectId,
  examKey: String,
  qNo: Number,                       // number in the source paper
  section: String,                   // = subject
  category: String,
  subcategory: String,
  difficulty: "easy" | "medium" | "hard",
  difficultySource: "ai" | "calibrated" | "manual",
  language: "hi" | "en" | "bilingual",
  text: String,                      // may contain LaTeX between $...$
  options: { A: String, B: String, C: String, D: String },
  correctOption: "A" | "B" | "C" | "D" | null,
  explanation: String,               // AI-written, optional
  hasFigure: Boolean,
  figurePath: String,                // cropped image, optional
  sourcePage: Number,
  confidence: Number,                // 0..1 from Gemini
  needsReview: Boolean,
  reviewReasons: [String],           // e.g. "missing answer", "unknown subcategory", "formula blank"
  origin: "extracted" | "ai_generated",
  verified: Boolean,                 // I approved it in review UI
  stats: { attempts: Number, correct: Number, avgTimeSec: Number },
  createdAt
}
```
Indexes: `{examKey, section, category, subcategory, difficulty, verified}`, `{paperId, qNo}` unique.

### Blueprint
```js
{
  examKey: String,
  basedOnPapers: [ObjectId],
  sections: [{
    name: String,
    total: Number,                                   // avg questions per paper
    categories: [{ name, count, subcategories: [{ name, count }] }]
  }],
  difficultyMix: { easy: Number, medium: Number, hard: Number },   // fractions summing to 1
  createdAt
}
```

### MockTest
```js
{
  examKey, title, mode: "full" | "sectional" | "custom",
  durationMinutes, blueprintId,
  questions: [{ questionId, section, order }],       // snapshot of order
  difficultyMix: {...},
  createdAt
}
```

### Attempt
```js
{
  mockTestId,
  startedAt, endsAt,              // endsAt = startedAt + duration (SERVER computed)
  submittedAt, status: "in_progress" | "submitted" | "auto_submitted",
  responses: [{
    questionId, chosen: "A"|"B"|"C"|"D"|null,
    status: "not_visited" | "not_answered" | "answered" | "marked" | "answered_marked",
    timeSpentSec: Number, lastUpdated
  }],
  result: {
    score, correct, wrong, unattempted, accuracy,
    sections: [{ name, score, correct, wrong, unattempted, timeSec }],
    subcategories: [{ section, category, subcategory, correct, wrong, total, accuracy }]
  }
}
```

---

## 9. REST API Specification

Base: `/api`. All responses JSON `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

### Papers
| Method | Path | Description |
|---|---|---|
| POST | `/papers` | multipart: `file` (pdf), `examKey`, `title`, `examDate`, `shift`. Saves PDF, creates Paper(status=uploaded). |
| POST | `/papers/:id/extract` | Starts background extraction. Returns immediately. |
| GET | `/papers/:id` | Paper + progress. UI polls every 3s. |
| GET | `/papers` | List all. |
| GET | `/papers/:id/pages/:n` | Serves page PNG (for review side-by-side). |
| DELETE | `/papers/:id` | Deletes paper, its questions, files. |

### Questions
| Method | Path | Description |
|---|---|---|
| GET | `/questions` | Filters: `paperId, section, category, subcategory, difficulty, needsReview, verified`; pagination. |
| GET | `/questions/:id` | One question. |
| PATCH | `/questions/:id` | Edit any field (review UI). Sets `verified` when asked. |
| POST | `/questions/:id/retag` | Re-run Gemini tagging for this question. |
| POST | `/papers/:id/approve` | Marks all non-flagged questions verified; paper status → approved. |

### Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/analytics/summary?examKey=` | Counts by section / category / subcategory / difficulty (aggregation). |
| POST | `/blueprints/build` | Body `{ examKey, paperIds? }` → computes and saves Blueprint (average over papers). |
| GET | `/blueprints/latest?examKey=` | Latest blueprint. |
| PATCH | `/blueprints/:id` | I can hand-edit counts. |

### Mock tests
| Method | Path | Description |
|---|---|---|
| POST | `/mocktests/generate` | Body `{ examKey, mode, sections?, difficultyMix?, avoidSeen: true, useAI: false }`. Returns MockTest + `warnings[]` if bank is too small. |
| GET | `/mocktests` / `/mocktests/:id` | List/get. |

### Attempts
| Method | Path | Description |
|---|---|---|
| POST | `/attempts` | `{ mockTestId }` → creates Attempt, returns `{ attemptId, endsAt, serverNow, questions (WITHOUT correctOption/explanation) }`. |
| GET | `/attempts/:id` | Resume (returns saved responses, `endsAt`, `serverNow`). |
| PUT | `/attempts/:id/answer` | `{ questionId, chosen, status, timeSpentSec }`. Rejected with 409 if `now > endsAt + 5s grace`. |
| POST | `/attempts/:id/submit` | Computes result. Idempotent. |
| GET | `/attempts/:id/result` | Result + full review with correct answers and explanations. |
| GET | `/attempts` | History list. |

**Security rule:** `correctOption` and `explanation` are NEVER sent to the client while attempt is `in_progress`.

---

## 10. Gemini Integration (all in `gemini.service.js`)

### 10.1 Rules
- Use File API / inline PDF bytes or PNG images — **vision only**.
- Always request JSON with a **response schema**; validate again with zod.
- Temperature `0` for extraction/tagging.
- Wrap every call with retry (3 tries, exponential backoff, handle 429/5xx).
- Never log the API key. Log token usage per call.

### 10.2 Chunking strategy
1. Split PDF into chunks of `PAGES_PER_CHUNK` (default 6) pages with **1 page overlap** so questions crossing a page break are not lost.
2. For each chunk, send PDF chunk (or its PNGs) + extract prompt.
3. Merge results; **dedupe by `qNo`** (prefer the entry with higher confidence / complete options).
4. After merge, compare found `qNo` list vs expected `1..120`; report missing numbers; auto-retry only the pages near missing numbers once.
5. Update `paper.progress` after each chunk.

### 10.3 Extraction prompt (`extract.prompt.js`)

```
You are extracting questions from a scanned/printed Indian competitive exam paper (RRB NTPC style).

INPUT: pages of an exam paper PDF. Each question starts with "Q.<number>" and has options A–D marked "Ans A. ... B. ... C. ... D. ...".

TASKS for EVERY question that STARTS on these pages:
1. q_no: the number after "Q.".
2. section: one of the section headers seen in the paper ("General Awareness", "Mathematics", "General Intelligence and Reasoning"). Use the nearest "Section :" header above the question; if unknown use the expected ranges: 1-50 General Awareness, 51-85 Mathematics, 86-120 General Intelligence and Reasoning.
3. question_text: copy EXACTLY as printed. Keep Hindi in Devanagari; keep English as is. FIX obvious broken conjunct spacing in Hindi (e.g., "झा रखंडखं" → "झारखंड") by READING THE VISUAL TEXT, not guessing.
4. options: A, B, C, D text, exactly as printed.
5. correct_option: the option shown in GREEN COLOR with a TICK ICON. Ignore the "chosen option" marker. If no green tick is visible, return null. NEVER guess the answer by solving the question.
6. Math: write all formulas, fractions, powers, roots as LaTeX inside $...$ (e.g., $\frac{3}{4}$, $x^2$, $\sqrt{5}$). If a formula or figure is blank/unreadable/an image, set has_figure_or_formula=true and put "[FIGURE]" at that place.
7. has_figure_or_formula: true if the question or any option depends on an image/diagram/blank formula.
8. language: "hi", "en" or "bilingual".
9. confidence: 0.0–1.0 how sure you are the extraction is complete and exact.
10. page_number: page (within this input) where the question starts.

Do NOT include questions that only continue from the previous chunk's overlap page unless their "Q." line is on these pages.
Return ONLY JSON matching the schema.
```

### 10.4 Tagging prompt (`tag.prompt.js`) — separate second call per batch of ~15 questions
(Separating extraction from tagging keeps both accurate and cheap to re-run when taxonomy changes.)

```
You are tagging exam questions. Use ONLY the TAXONOMY below.

TAXONOMY (JSON): {{taxonomy_json}}

For each question return:
- section, category, subcategory (exact strings from taxonomy; if nothing fits use category "Other", subcategory "Other")
- difficulty: "easy" | "medium" | "hard" using this rubric for an RRB NTPC (graduate-level entry) candidate:
  * easy   = direct recall or one-step calculation; solvable in < 30 seconds
  * medium = 2–3 steps, a standard formula/concept applied, 30–75 seconds
  * hard   = multi-step, tricky wording, several concepts combined, or > 75 seconds
- explanation: short step-by-step solution in the question's language (Maths/Reasoning only; for GA give a 1-line fact). Only if you are confident.
- answer_check: for Maths/Reasoning, solve the question yourself and return "solved_option". If it differs from the extracted correct_option, set "mismatch": true.

Return ONLY JSON.
```
`mismatch: true` → `needsReview = true`, reason "answer mismatch".

### 10.5 JSON schema for extraction (zod mirror)
```js
const ExtractedQuestion = z.object({
  q_no: z.number().int().positive(),
  section: z.string(),
  question_text: z.string().min(1),
  options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
  correct_option: z.enum(["A","B","C","D"]).nullable(),
  has_figure_or_formula: z.boolean(),
  language: z.enum(["hi","en","bilingual"]),
  confidence: z.number().min(0).max(1),
  page_number: z.number().int().positive()
});
```

### 10.6 Post-extraction validation → `needsReview` reasons
- Missing/empty option (< 4 options)
- `correct_option` null → "missing answer"
- `confidence < 0.8`
- `has_figure_or_formula` true → "figure/formula — check page image"
- Category/subcategory not in taxonomy (after normalization) → "unknown tag"
- Answer mismatch from tagging step
- Duplicate/missing `qNo`

### 10.7 Figure handling
For `hasFigure` questions: render the source page to PNG (150 DPI), store `sourcePage`; in the Review UI show the page image beside the extracted data so I can fix it manually. (Optional later: ask Gemini for a bounding box and crop with `sharp`.)

---

## 11. Analytics & Blueprint (`analytics.service.js`)

No LLM needed — MongoDB aggregation:

```js
Question.aggregate([
  { $match: { examKey, verified: true, origin: "extracted" } },
  { $group: { _id: { section:"$section", category:"$category", subcategory:"$subcategory", difficulty:"$difficulty" }, count: { $sum: 1 } } }
])
```

**Blueprint building:**
1. For each selected paper, count questions per `section/category/subcategory`.
2. Average across papers, round with largest-remainder method so section totals equal the profile (50 / 35 / 35).
3. `difficultyMix` = overall share of easy/medium/hard (fallback `{0.3, 0.5, 0.2}` when < 30 questions).
4. Save as Blueprint; allow manual edit.

Analytics UI shows: bar chart per section, table of subcategory counts, difficulty pie, and a "most repeated topics" list (top 10 subcategories by count).

---

## 12. Mock Test Generator (`generator.service.js`)

**Input:** blueprint, mode, difficulty mix, `avoidSeen`.

**Algorithm:**
```
for each section in profile (order):
  for each category/subcategory in blueprint with count n:
     need[easy|medium|hard] = round(n * difficultyMix)   // fix rounding so sum == n
     for each difficulty d:
        pick `need[d]` random verified questions matching (section, subcategory, d)
        excluding: questionIds already used in this mock, and (if avoidSeen) ids seen in previous attempts
        if not enough: fallback order
            1) same subcategory, any difficulty
            2) same category, any difficulty
            3) same section, any
            4) record a warning
  shuffle within subcategory groups lightly, but keep section order
ensure final counts == profile (50/35/35); fill from any verified question in that section if short.
```
- **Modes:** `full` (120 Qs, 90 min), `sectional` (one section, time proportional: 50Q→37.5 → use 38 min; 35Q→26 min), `custom` (select subcategories + count + difficulty; time = count × 45s).
- Returns `warnings` such as: "Only 3 'Blood Relations' questions in bank; filled 2 from 'Direction and Distance'".
- **Phase 7 (AI generation):** when `useAI: true` or the bank is short, call Gemini with `generate.prompt.js` to create **new** questions for the missing (subcategory, difficulty), then run a **second independent Gemini call to solve it**; accept only if both answers agree; store with `origin: "ai_generated"`, `verified: false` until I approve (or auto-approve with a setting).

---

## 13. Exam UI Specification (mimic real RRB/iON interface)

### 13.1 Flow
`CreateMock → Instructions page (checkbox "I have read…") → ExamScreen → Submit confirmation → Result`.

### 13.2 ExamScreen layout
```
┌────────────────────────────────────────────────────────────────────┐
│ Exam title                         Time Left: 01:29:58   [Candidate]│
├────────────────────────────────────────────────────────────────────┤
│ [General Awareness] [Mathematics] [Reasoning]                      │
├───────────────────────────────────────────┬────────────────────────┤
│ Question No. 7            +1 / -0.33      │  Palette (grid 1..N)   │
│ Question text (MathText)                  │  ● Answered            │
│ ( ) A. ...                                │  ● Not Answered        │
│ ( ) B. ...                                │  ● Not Visited         │
│ ( ) C. ...                                │  ● Marked for Review   │
│ ( ) D. ...                                │  ● Answered & Marked   │
│ [figure/image if any]                     │  counts for each       │
├───────────────────────────────────────────┴────────────────────────┤
│ [Mark for Review & Next] [Clear Response] [Save & Next]  [Submit]  │
└────────────────────────────────────────────────────────────────────┘
```

### 13.3 Palette states and colors
| State | Meaning | Color |
|---|---|---|
| not_visited | never opened | grey |
| not_answered | opened, no answer | red |
| answered | option saved | green |
| marked | marked for review, no answer | purple |
| answered_marked | answered + marked | purple with green dot |

### 13.4 Behaviors
- **Server-authoritative timer:** on load, call `/attempts/:id` → `{ endsAt, serverNow }`. Compute `offset = serverNow - Date.now()`; display `endsAt - (Date.now() + offset)`. Refresh/reopen resumes with correct remaining time. Changing device clock has no effect.
- Timer turns red under 5 minutes; toast at 10 and 5 minutes.
- **Auto-submit** at 0:00 → call `/submit`, go to Result. Server also auto-closes attempts past `endsAt` lazily on any request.
- **Autosave:** each Save & Next / Clear / Mark triggers `PUT /answer` (debounced, with retry queue if offline; show "Saving…" indicator).
- **Per-question time tracking:** accumulate seconds while a question is visible; send with answer.
- Switching sections is allowed (profile `sectionLock=false`). Section tab shows answered/total.
- Clicking palette number jumps to the question; leaving a not-visited question marks it `not_answered`.
- Keyboard: `A–D`/`1–4` select option, `N` Save & Next, `M` Mark, `C` Clear, `←/→` navigate.
- Request **fullscreen** on start; on `visibilitychange`/fullscreen exit, show warning and count "tab switches" (stored in attempt, informational only for personal use).
- Block text selection and right-click inside the question area (cosmetic realism only).
- Submit modal shows per-section summary (answered / not answered / marked / not visited) and requires confirm.
- Language toggle (Hindi/English) is shown only when a question has both languages (Phase 8).
- Responsive: palette collapses to a drawer on small screens.

### 13.5 Result page
- Total score = `correct × 1 − wrong × (1/3)`, rounded to 2 decimals; correct / wrong / unattempted / accuracy / attempted %.
- Section-wise table and bar chart (score, accuracy, time).
- **Subcategory weak-area table** sorted by accuracy ascending.
- Time analysis: average time per question vs. recommended (90 min / 120 = 45 s); list of slowest 10 questions.
- **Solution review:** every question with my answer, correct answer, explanation, filter by (wrong / unattempted / marked / section).
- "Create practice test from my weak areas" button → `custom` mode generator with the weakest subcategories.

---

## 14. Scoring & Difficulty Calibration

```js
score = correct * 1 - wrong * (1/3);
accuracy = correct / (correct + wrong) || 0;
```
After each submitted attempt update `question.stats`. Once a question has ≥ 5 attempts (later: across users; for personal use ≥ 2 attempts), recalibrate:
- accuracy ≥ 0.80 → `easy`
- 0.35 < accuracy < 0.80 → `medium`
- accuracy ≤ 0.35 → `hard`
Set `difficultySource = "calibrated"`.

---

## 15. Error Handling, Logging, Quality Rules

- Central Express error middleware returning the `{ ok:false, error }` shape. Use custom `AppError(code, message, status)`.
- Extraction runs in the background (in-process async queue with concurrency from env). On server restart, papers stuck in `extracting` are reset to `uploaded`.
- Every Gemini failure after retries marks that chunk as failed; the paper can resume (`POST /extract` re-runs only failed chunks).
- Validate all request bodies with zod.
- Code style: ES modules, async/await, no business logic in routes, services are pure where possible.
- Write unit tests (Vitest/Jest) for: scoring, blueprint rounding, generator fallback, taxonomy normalizer, timer offset math, extraction merge/dedupe.
- README must contain: install steps, `.env` setup, how to run MongoDB, how to run server and client, how to test with the sample paper.

---

## 16. Build Phases (give to the LLM one at a time)

### Phase 1 — Foundation
Create the folder structure, `package.json` files, env validation, Mongo connection, all Mongoose models, seed script for ExamProfile + taxonomy loader, health route `/api/health`, error middleware, `.gitignore`.
**Done when:** `npm run dev` starts server, connects to Mongo, seed creates the RRB profile.

### Phase 2 — Upload + page rendering
`POST /papers` (multer, save PDF locally), render pages to PNG, `GET /papers/:id/pages/:n`. React `UploadPaper` page with progress.
**Done when:** I upload the sample PDF and see the page thumbnails.

### Phase 3 — Gemini extraction
`gemini.service`, prompts, chunking with overlap, zod validation, merge/dedupe, missing-number detection, background job + progress polling, taxonomy tagging step, needsReview flags.
**Done when:** the sample paper yields ~120 questions in the DB with stats `found/expected`, and `needsReview` listed.

### Phase 4 — Review UI
`ReviewQuestions` page: left = page image, right = editable form (text, options, correct answer, tags, difficulty), with MathText preview, filters (needsReview), approve/next, bulk approve, retag button.
**Done when:** I can fix and approve all questions.

### Phase 5 — Analytics & Blueprint
Aggregation endpoints, blueprint builder with largest-remainder rounding, `Analytics` page with charts and editable blueprint.
**Done when:** blueprint shows 50/35/35 split with subcategory counts.

### Phase 6 — Mock generator + Exam UI + Results
Generator service with fallbacks and warnings; CreateMock, Instructions, ExamScreen (timer, palette, actions, autosave, auto-submit, fullscreen), scoring, Result page, attempt history.
**Done when:** I can generate a 120-question mock, take it with a live timer, refresh mid-test without losing time, and see results with negative marking.

### Phase 7 — AI question generation (optional)
Generate + double-verify new questions to fill bank gaps; "Generate more" button per subcategory; `origin: ai_generated` badge.

### Phase 8 — Polish
Difficulty calibration job, weak-area practice generator, Hindi/English toggle, export results as PDF, basic auth, support for another exam profile, dark mode.

---

## 17. Acceptance Test Checklist (using the sample paper)

- [ ] 120 questions detected (50 GA / 35 Maths / 35 Reasoning).
- [ ] Q5 text reads correctly ("झारखंड के सिंहभूम जिले के गुआ और नोआमुंडी…") despite broken source text.
- [ ] Q1 correct answer = **B. कार्बन डाइऑक्साइड** (green tick) captured visually.
- [ ] Q51, Q54, Q73, Q74, Q77 flagged `hasFigure`/needsReview (formulas blank in source text) and fixable in review UI.
- [ ] Q14 stored as `en`.
- [ ] Analytics shows counts per category; blueprint totals 120.
- [ ] Generated mock has no duplicate questions and honors difficulty mix within ±1 per group.
- [ ] Timer: refresh keeps remaining time; changing system clock doesn't change it; auto-submit at 0.
- [ ] Wrong answers deduct exactly 1/3.
- [ ] `correctOption` never appears in network responses during an in-progress attempt.

---

## 18. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gemini misreads Hindi conjuncts | Vision input, `temperature 0`, review UI with page image |
| Green tick not detected | Null answer → forced manual review; never infer by solving |
| LLM invents new tags | Fixed taxonomy + normalizer + `Other` bucket |
| Subjective difficulty | Calibrate from my real accuracy |
| Small question bank (1 paper = 120 Qs) | Add more papers; Phase 7 AI generation; allow reuse after seen-list resets |
| Copyright | Personal use only; keep PDFs local; prefer AI-generated questions if ever shared |
| API quota/cost | Chunking, caching extraction results per paper, `EXTRACTION_CONCURRENCY` |

---

## 19. Instructions for the Coding LLM (read carefully)

1. Follow this document literally; if something is ambiguous, choose the simplest option and note it in `DECISIONS.md`.
2. Implement one phase at a time. At the end of each phase: list created files, give run commands, and give a manual test script.
3. Never expose answers to the client during an attempt.
4. Never put API keys in code or the repo.
5. All Gemini calls go through `gemini.service.js` only.
6. Keep controllers thin; logic in services; validate with zod.
7. Use the exact field names, endpoints and states defined above.
8. Do not add libraries beyond Section 2 without asking.
