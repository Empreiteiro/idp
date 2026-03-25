PYTHON  := $(shell command -v python3 2>/dev/null || command -v python 2>/dev/null)
PIP     := $(shell command -v pip3 2>/dev/null || command -v pip 2>/dev/null)

.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend start start-backend start-frontend build lint test clean migrate

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Install ──────────────────────────────────────────────

install: install-backend install-frontend ## Install all dependencies

install-backend: ## Install backend dependencies
	cd backend && $(PIP) install -r requirements.txt

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

# ── Dev mode (with hot-reload) ───────────────────────────

dev: ## Start backend and frontend in dev mode (parallel)
	@make -j2 dev-backend dev-frontend

dev-backend: ## Start backend in dev mode (uvicorn --reload)
	cd backend && $(PYTHON) run.py

dev-frontend: ## Start frontend in dev mode (next dev)
	cd frontend && npx next dev

# ── Production ───────────────────────────────────────────

start: start-backend start-frontend ## Start backend and frontend in production mode

start-backend: ## Start backend in production mode
	cd backend && $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000

start-frontend: ## Start frontend in production mode
	cd frontend && npx next start

build: ## Build frontend for production
	cd frontend && npx next build

# ── Quality ──────────────────────────────────────────────

lint: ## Run frontend linter
	cd frontend && npm run lint

test: ## Run backend tests
	cd backend && $(PYTHON) -m pytest

# ── Database ─────────────────────────────────────────────

migrate: ## Run database migrations
	cd backend && $(PYTHON) -m alembic upgrade head

migrate-new: ## Create a new migration (usage: make migrate-new MSG="description")
	cd backend && $(PYTHON) -m alembic revision --autogenerate -m "$(MSG)"

# ── Cleanup ──────────────────────────────────────────────

clean: ## Remove build artifacts and caches
	rm -rf frontend/.next frontend/node_modules/.cache
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
