# IDP - Intelligent Document Processing

A full-stack platform for intelligent document processing with OCR and AI.

## Features

- **Template Management**: Create extraction templates with AI-powered field suggestions
- **Document Upload**: Upload PDFs and images with automatic data extraction
- **Auto-Classification**: Automatic document classification into existing templates
- **Multi-Provider AI**: Support for OpenAI, Claude (Anthropic), and Gemini (Google)
- **Extraction Review**: Review interface with inline editing and confidence badges
- **Data Tables**: Tabular view of extracted data by template
- **CSV Export**: Export extracted data to CSV
- **Activity Log**: Full history of all platform operations
- **Batch Upload**: Upload multiple documents at once
- **Connection Testing**: Test AI and OCR connections directly from the UI
- **Dashboard**: Processing statistics and overview
- **Template Assignment**: Manual template assignment for unclassified documents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| OCR | pdfplumber (primary) + Tesseract + pdf2image (fallback) |
| AI | OpenAI / Claude / Gemini (configurable) |
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| State | TanStack Query (React Query) |

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Tesseract OCR** (optional, only needed for scanned PDFs)
- **libmagic** (file type detection)

### Installing system dependencies

<details>
<summary>macOS</summary>

```bash
brew install python3 node tesseract libmagic poppler
```
</details>

<details>
<summary>Ubuntu / Debian</summary>

```bash
sudo apt install python3 python3-pip python3-venv nodejs npm tesseract-ocr libmagic1 poppler-utils
```
</details>

<details>
<summary>Fedora</summary>

```bash
sudo dnf install python3 python3-pip nodejs npm tesseract libmagic poppler-utils
```
</details>

<details>
<summary>Windows</summary>

1. Python: https://www.python.org/downloads/
2. Node.js: https://nodejs.org/
3. Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
4. Poppler: https://github.com/oschwartz10612/poppler-windows/releases
</details>

## Quick Start

The project includes a **Makefile** that auto-detects your toolchain (Python, Node, OS) and handles dependency installation automatically.

```bash
# Full setup (check dependencies, create .env, install packages)
make setup

# Start both backend and frontend in dev mode (with hot-reload)
make dev
```

That's it. The `make dev` command will automatically install missing dependencies before starting.

## Available Make Commands

Run `make help` to see all commands with your detected toolchain:

| Command | Description |
|---------|-------------|
| `make setup` | Full project setup (check deps, create .env, install) |
| `make install` | Install all dependencies |
| `make dev` | Start backend + frontend in dev mode (parallel, hot-reload) |
| `make dev-backend` | Start only the backend in dev mode |
| `make dev-frontend` | Start only the frontend in dev mode |
| `make start` | Start both in production mode |
| `make build` | Build frontend for production |
| `make test` | Run backend tests |
| `make lint` | Run frontend linter |
| `make migrate` | Run database migrations |
| `make migrate-new MSG="desc"` | Create a new migration |
| `make venv` | Create a Python virtual environment (.venv) |
| `make env` | Create .env from .env.example |
| `make clean` | Remove build artifacts and caches |
| `make check-deps` | Verify all required tools are installed |

### Using a virtual environment (recommended)

```bash
make venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows
make setup
make dev
```

## Manual Setup

If you prefer not to use Make:

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API key (or configure via the UI)
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

### 1. Initial Configuration
- Open http://localhost:3000
- Go to **Settings** and configure the AI provider + API key
- Click "Test AI Connection" to verify

### 2. Create a Template
- Go to **Templates** > **New Template**
- Enter a name (e.g., "Invoice", "Contract", "Receipt")
- Upload a sample document
- AI will automatically suggest extractable fields
- Review, add, or remove fields as needed

### 3. Process Documents
- Go to **Upload** and select one or more documents
- Choose a template or let the AI classify automatically
- The system runs: OCR > Classification > Extraction > Storage

### 4. Review Data
- In **Documents**, click on a processed document
- View the document side by side with extracted data
- Edit incorrect values and approve the extraction

### 5. View & Export
- In **Extracted Data**, see all data in tabular format
- Filter by template, search for specific values
- Export to CSV for use in spreadsheets

## API Documentation

Swagger UI: http://localhost:8000/docs

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | General statistics |
| POST | /api/templates | Create template |
| POST | /api/templates/{id}/suggest-fields | AI field suggestions |
| POST | /api/documents/upload | Upload document |
| POST | /api/documents/upload-batch | Batch upload |
| GET | /api/documents/{id} | Document details |
| PUT | /api/documents/{id}/assign-template | Assign template |
| GET | /api/data/templates/{id}/table | Tabular data |
| GET | /api/data/templates/{id}/export | Export CSV |
| GET | /api/activity | Activity log |
| POST | /api/settings/test-ai | Test AI connection |
| POST | /api/settings/test-ocr | Test OCR |
