# AI Mock Test Generator

Local single-user app for uploading exam papers, reviewing extracted questions, analyzing the verified question bank, and taking generated mock tests. Uploaded PDFs and rendered pages stay under `storage/papers/`.

## Requirements

- Node.js 20 or newer (or Docker & Docker Compose)
- MongoDB 8.0 running locally or via Docker
- A Google Gemini API key for extraction, retagging, and AI question generation

## Install and configure

1. Set up your environment file:

```bash
# On Linux/macOS
cp server/.env.example server/.env

# On Windows (PowerShell)
Copy-Item .\server\.env.example .\server\.env
```

2. Open `server/.env` and set `GEMINI_API_KEY` to your key. Keep secrets in `server/.env`; never put a key in source files. `GEMINI_MODEL` defaults to `gemini-2.5-flash` (or `gemini-3.8-flash`).

---

## Run with Docker

### Option A: Run Everything with Docker (Recommended)

Starts MongoDB, Backend API, and Frontend Vite client in containers with a single command:

```bash
# Start all services in the background
docker compose up -d

# View real-time logs across all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f server
docker compose logs -f client
docker compose logs -f mongodb

# Stop all services
docker compose down
```

Once running:
- **Frontend App:** http://localhost:5173
- **Backend API:** http://localhost:5000 (`/api/health`)
- Uploaded papers & rendered pages persist safely on your machine under `./storage`.

### Option B: Hybrid Workflow (MongoDB in Docker + Local Dev)

Recommended if you are actively editing code and want instant Vite Hot-Module Replacement (HMR) and fast Node watch reloads:

1. **Start only MongoDB in Docker:**
   ```bash
   docker compose up -d mongodb
   ```

2. **In a second terminal, install & run the Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **In a third terminal, install & run the Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

---

### Useful Docker Commands

| Action | Command |
|---|---|
| **Check running containers** | `docker compose ps` |
| **View live logs** | `docker compose logs -f` |
| **Check backend health** | `curl http://localhost:5000/api/health` |
| **Rebuild containers after code changes** | `docker compose up -d --build` |
| **Restart a single service** | `docker compose restart server` |
| **Stop all containers (preserves database data)** | `docker compose down` |
| **Stop and completely reset database volume** | `docker compose down -v` |

---

## Run Locally (Without Docker)

If you have MongoDB installed directly on your machine:

1. Install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. Start MongoDB locally on `mongodb://127.0.0.1:27017/mocktest`.

3. In one terminal, start the server:
   ```bash
   cd server
   npm run dev
   ```

4. In a second terminal, start the client:
   ```bash
   cd client
   npm run dev
   ```

Open the Vite URL, normally `http://localhost:5173`. The API listens on `http://localhost:5000`; the health endpoint is `/api/health`.

## Sample paper workflow

The supplied sample is `storage/RRB-NTPC-CBT2_17-Sep-2026_Question-Paper-Hindi-exam.pdf` (expected 120 questions).

1. Open **Upload paper**, enter the profile key `rrb-ntpc-ug-cbt2`, title, date, and shift, then select the PDF.
2. Start extraction and wait for chunk/retry progress to finish. Check `found / expected`, failed chunks, and missing question numbers.
3. Open **Review questions** to inspect flagged items beside their source page, correct the text/options/tags/answer, and approve each item. Bulk approval verifies only non-flagged questions.
4. Open **Analytics** and build a blueprint from verified questions. Section totals stay equal to the ExamProfile totals.
5. Open **Create mock**, generate a full, sectional, or custom test, read the instructions, and start the exam. Refreshing the exam page resumes the saved attempt and server-authoritative deadline.
6. Submit the test to see the score, negative marking, answer review, weak areas, practice generation, and PDF export.

## Useful API paths

- Papers: `/api/papers`, `/api/papers/:id/extract`, `/api/papers/:id/pages/:n`
- Questions: `/api/questions`, `/api/questions/:id`, `/api/questions/:id/retag`
- Analytics and blueprints: `/api/analytics/summary`, `/api/blueprints/build`, `/api/blueprints/latest`
- Mock tests: `/api/mocktests/generate`, `/api/mocktests/weak-area-practice`
- Attempts: `/api/attempts`, `/api/attempts/:id`, `/api/attempts/:id/result`

AI-generated questions use two independent Gemini calls for answer verification and remain unverified until reviewed. Correct answers and explanations are omitted from attempt responses while an attempt is in progress.
