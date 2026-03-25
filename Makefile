# ── Auto-detect toolchain ────────────────────────────────
# Python: python3 > python; pip3 > pip; supports virtualenv (.venv)
# Node: npm > yarn > pnpm
# OS: Linux, macOS, Windows (WSL/MSYS/Git Bash)

SHELL := /bin/bash

# Detect virtualenv — prefer .venv in project root
VENV_DIR   := $(wildcard .venv)
ifdef VENV_DIR
  PYTHON := .venv/bin/python
  PIP    := .venv/bin/pip
else
  PYTHON := $(shell command -v python3 2>/dev/null || command -v python 2>/dev/null)
  PIP    := $(shell command -v pip3 2>/dev/null || command -v pip 2>/dev/null)
endif

# Detect Node package manager — npm > yarn > pnpm
NPM := $(shell command -v npm 2>/dev/null || command -v yarn 2>/dev/null || command -v pnpm 2>/dev/null)
NPM_NAME := $(notdir $(NPM))

# Detect npx or equivalent runner
NPX := $(shell command -v npx 2>/dev/null)
ifndef NPX
  # Fallback: call next from node_modules directly
  NPX := ./node_modules/.bin
endif

# OS detection
UNAME_S := $(shell uname -s 2>/dev/null || echo Windows)
ifeq ($(UNAME_S),Darwin)
  OPEN_CMD := open
else ifeq ($(findstring MINGW,$(UNAME_S)),MINGW)
  OPEN_CMD := start
else ifeq ($(findstring MSYS,$(UNAME_S)),MSYS)
  OPEN_CMD := start
else
  OPEN_CMD := xdg-open
endif

# ── Phony targets ───────────────────────────────────────
.PHONY: help check-deps install install-backend install-frontend \
        venv dev dev-backend dev-frontend \
        start start-backend start-frontend build \
        lint test clean migrate migrate-new setup env

# ── Default ──────────────────────────────────────────────

.DEFAULT_GOAL := help

help: ## Show available commands
	@echo ""
	@echo "  IDP — Available commands"
	@echo "  ────────────────────────"
	@echo ""
	@echo "  Detected toolchain:"
	@echo "    Python : $(or $(PYTHON),NOT FOUND)"
	@echo "    Pip    : $(or $(PIP),NOT FOUND)"
	@echo "    Node PM : $(or $(NPM_NAME),NOT FOUND)"
	@echo "    OS     : $(UNAME_S)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Checks ───────────────────────────────────────────────

check-python:
	@if [ -z "$(PYTHON)" ]; then \
		echo "Error: Python not found. Install Python 3.10+ from https://www.python.org/downloads/"; \
		exit 1; \
	fi

check-pip: check-python
	@if [ -z "$(PIP)" ]; then \
		echo "Error: pip not found. Run: $(PYTHON) -m ensurepip --upgrade"; \
		exit 1; \
	fi

check-node:
	@if [ -z "$(NPM)" ]; then \
		echo "Error: No Node package manager found. Install Node.js 18+ from https://nodejs.org/"; \
		exit 1; \
	fi

check-deps: check-pip check-node ## Verify all required tools are installed
	@echo "All dependencies found."

# ── Setup ────────────────────────────────────────────────

venv: ## Create Python virtual environment (.venv)
	@if [ -d ".venv" ]; then \
		echo "Virtual environment already exists at .venv"; \
	else \
		echo "Creating virtual environment..."; \
		$(shell command -v python3 2>/dev/null || command -v python 2>/dev/null) -m venv .venv; \
		echo "Done. Activate with:"; \
		echo "  Linux/macOS : source .venv/bin/activate"; \
		echo "  Windows     : .venv\\Scripts\\activate"; \
		echo "Then run: make install"; \
	fi

env: ## Create .env from .env.example (if missing)
	@if [ -f backend/.env ]; then \
		echo "backend/.env already exists, skipping."; \
	elif [ -f backend/.env.example ]; then \
		cp backend/.env.example backend/.env; \
		echo "Created backend/.env from .env.example — edit it with your settings."; \
	else \
		echo "No .env.example found, skipping."; \
	fi

setup: check-deps env install ## Full project setup (check deps, env, install)
	@echo ""
	@echo "Setup complete! Run 'make dev' to start developing."

# ── Install ──────────────────────────────────────────────

install: install-backend install-frontend ## Install all dependencies

install-backend: check-pip ## Install backend dependencies
	cd backend && $(PIP) install -r requirements.txt

install-frontend: check-node ## Install frontend dependencies
	cd frontend && $(NPM) install

# ── Dev mode (with hot-reload) ───────────────────────────

dev: check-python check-node ## Start backend and frontend in dev mode (parallel)
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: check-python ## Start backend in dev mode (uvicorn --reload)
	cd backend && $(PYTHON) run.py

dev-frontend: check-node ## Start frontend in dev mode (next dev)
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn dev
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm dev
else
	cd frontend && npx --yes next dev
endif

# ── Production ───────────────────────────────────────────

start: start-backend start-frontend ## Start backend and frontend in production mode

start-backend: check-python ## Start backend in production mode
	cd backend && $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000

start-frontend: check-node ## Start frontend in production mode
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn start
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm start
else
	cd frontend && npx --yes next start
endif

build: check-node ## Build frontend for production
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn build
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm build
else
	cd frontend && npx --yes next build
endif

# ── Quality ──────────────────────────────────────────────

lint: check-node ## Run frontend linter
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn lint
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm lint
else
	cd frontend && npm run lint
endif

test: check-python ## Run backend tests
	cd backend && $(PYTHON) -m pytest

# ── Database ─────────────────────────────────────────────

migrate: check-python ## Run database migrations
	cd backend && $(PYTHON) -m alembic upgrade head

migrate-new: check-python ## Create a new migration (usage: make migrate-new MSG="description")
	@if [ -z "$(MSG)" ]; then \
		echo "Error: MSG is required. Usage: make migrate-new MSG=\"your description\""; \
		exit 1; \
	fi
	cd backend && $(PYTHON) -m alembic revision --autogenerate -m "$(MSG)"

# ── Cleanup ──────────────────────────────────────────────

clean: ## Remove build artifacts and caches
	rm -rf frontend/.next frontend/node_modules/.cache
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned build artifacts and caches."
