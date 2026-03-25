# ── Auto-detect toolchain ────────────────────────────────
# Python: python3 > python; pip3 > pip; supports virtualenv (.venv)
# Node: npm > yarn > pnpm
# OS: Linux, macOS, Windows (WSL/MSYS/Git Bash)

SHELL := /bin/bash

# ── Python detection ────────────────────────────────────
# Priority: .venv > system python3 > system python
VENV_DIR := $(wildcard .venv)
ifdef VENV_DIR
  ifeq ($(OS),Windows_NT)
    PYTHON := .venv/Scripts/python
    PIP    := .venv/Scripts/pip
  else
    PYTHON := .venv/bin/python
    PIP    := .venv/bin/pip
  endif
else
  PYTHON := $(shell command -v python3 2>/dev/null || command -v python 2>/dev/null)
  PIP    := $(shell command -v pip3 2>/dev/null || command -v pip 2>/dev/null)
endif

# ── Node detection ──────────────────────────────────────
# Priority: npm > yarn > pnpm
NPM := $(shell command -v npm 2>/dev/null || command -v yarn 2>/dev/null || command -v pnpm 2>/dev/null)
NPM_NAME := $(notdir $(NPM))

# ── OS detection ────────────────────────────────────────
UNAME_S := $(shell uname -s 2>/dev/null || echo Windows)
ifeq ($(OS),Windows_NT)
  DETECTED_OS := Windows
  OPEN_CMD := start
  RMRF := rmdir /s /q
else ifeq ($(UNAME_S),Darwin)
  DETECTED_OS := macOS
  OPEN_CMD := open
  RMRF := rm -rf
else
  DETECTED_OS := Linux
  OPEN_CMD := xdg-open
  RMRF := rm -rf
endif

# ── Phony targets ───────────────────────────────────────
.PHONY: help check-deps install install-backend install-frontend \
        venv dev dev-backend dev-frontend \
        start start-backend start-frontend build \
        lint test clean migrate migrate-new setup env \
        _ensure-backend _ensure-frontend

# ── Default ──────────────────────────────────────────────

.DEFAULT_GOAL := help

help: ## Show available commands
	@echo ""
	@echo "  IDP — Available commands"
	@echo "  ────────────────────────"
	@echo ""
	@echo "  Detected toolchain:"
	@echo "    Python  : $(or $(PYTHON),NOT FOUND)"
	@echo "    Pip     : $(or $(PIP),NOT FOUND)"
	@echo "    Node PM : $(or $(NPM_NAME),NOT FOUND)"
	@echo "    OS      : $(DETECTED_OS)"
	@echo "    Venv    : $(if $(VENV_DIR),active (.venv),not found)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Checks ───────────────────────────────────────────────

check-python:
	@if [ -z "$(PYTHON)" ]; then \
		echo ""; \
		echo "  Error: Python not found."; \
		echo ""; \
		echo "  Install Python 3.10+:"; \
		echo "    macOS   : brew install python3"; \
		echo "    Ubuntu  : sudo apt install python3 python3-venv python3-pip"; \
		echo "    Fedora  : sudo dnf install python3 python3-pip"; \
		echo "    Windows : https://www.python.org/downloads/"; \
		echo ""; \
		exit 1; \
	fi

check-pip: check-python
	@if [ -z "$(PIP)" ]; then \
		echo ""; \
		echo "  Error: pip not found."; \
		echo ""; \
		echo "  Install pip:"; \
		echo "    Option 1 : $(PYTHON) -m ensurepip --upgrade"; \
		echo "    Option 2 : sudo apt install python3-pip  (Ubuntu/Debian)"; \
		echo "    Option 3 : brew install python3  (macOS, includes pip)"; \
		echo ""; \
		exit 1; \
	fi

check-node:
	@if [ -z "$(NPM)" ]; then \
		echo ""; \
		echo "  Error: No Node.js package manager found."; \
		echo ""; \
		echo "  Install Node.js 18+:"; \
		echo "    macOS   : brew install node"; \
		echo "    Ubuntu  : sudo apt install nodejs npm"; \
		echo "    Fedora  : sudo dnf install nodejs npm"; \
		echo "    Windows : https://nodejs.org/"; \
		echo "    Any     : https://github.com/nvm-sh/nvm (recommended)"; \
		echo ""; \
		exit 1; \
	fi

check-deps: check-pip check-node ## Verify all required tools are installed
	@echo "All dependencies found."

# ── Runtime dependency checks ────────────────────────────
# These check if packages are actually importable/present,
# not just if a sentinel file exists (handles switching Python, etc.)

_ensure-backend: check-pip
	@$(PYTHON) -c "import uvicorn" 2>/dev/null || { \
		echo ""; \
		echo "  Backend dependencies missing. Installing..."; \
		echo ""; \
		cd backend && $(PIP) install -r requirements.txt; \
	}

_ensure-frontend: check-node
	@if [ ! -d "frontend/node_modules" ]; then \
		echo ""; \
		echo "  Frontend dependencies missing. Installing..."; \
		echo ""; \
		cd frontend && $(NPM) install; \
	fi

# ── Setup ────────────────────────────────────────────────

venv: ## Create Python virtual environment (.venv)
	@if [ -d ".venv" ]; then \
		echo "Virtual environment already exists at .venv"; \
	else \
		echo "Creating virtual environment..."; \
		$(shell command -v python3 2>/dev/null || command -v python 2>/dev/null) -m venv .venv; \
		echo ""; \
		echo "Done. Activate with:"; \
		echo "  Linux/macOS : source .venv/bin/activate"; \
		echo "  Windows CMD : .venv\\Scripts\\activate.bat"; \
		echo "  PowerShell  : .venv\\Scripts\\Activate.ps1"; \
		echo ""; \
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

dev: _ensure-backend _ensure-frontend ## Start backend and frontend in dev mode (parallel)
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: _ensure-backend ## Start backend in dev mode (uvicorn --reload)
	cd backend && $(PYTHON) run.py

dev-frontend: _ensure-frontend ## Start frontend in dev mode (next dev)
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn dev
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm dev
else
	cd frontend && npm run dev
endif

# ── Production ───────────────────────────────────────────

start: start-backend start-frontend ## Start backend and frontend in production mode

start-backend: _ensure-backend ## Start backend in production mode
	cd backend && $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000

start-frontend: _ensure-frontend ## Start frontend in production mode
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn start
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm start
else
	cd frontend && npm run start
endif

build: _ensure-frontend ## Build frontend for production
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn build
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm build
else
	cd frontend && npm run build
endif

# ── Quality ──────────────────────────────────────────────

lint: _ensure-frontend ## Run frontend linter
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn lint
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm lint
else
	cd frontend && npm run lint
endif

test: _ensure-backend ## Run backend tests
	cd backend && $(PYTHON) -m pytest

# ── Database ─────────────────────────────────────────────

migrate: _ensure-backend ## Run database migrations
	cd backend && $(PYTHON) -m alembic upgrade head

migrate-new: _ensure-backend ## Create a new migration (usage: make migrate-new MSG="description")
	@if [ -z "$(MSG)" ]; then \
		echo "Error: MSG is required. Usage: make migrate-new MSG=\"your description\""; \
		exit 1; \
	fi
	cd backend && $(PYTHON) -m alembic revision --autogenerate -m "$(MSG)"

# ── Cleanup ──────────────────────────────────────────────

clean: ## Remove build artifacts and caches
	$(RMRF) frontend/.next frontend/node_modules/.cache 2>/dev/null || true
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "Cleaned build artifacts and caches."
