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
  # Windows .venv uses Scripts/ not bin/
  RMRF := rmdir /s /q
  FIND_CLEAN := if exist backend\__pycache__ rmdir /s /q backend\__pycache__
else ifeq ($(UNAME_S),Darwin)
  DETECTED_OS := macOS
  OPEN_CMD := open
  RMRF := rm -rf
else
  DETECTED_OS := Linux
  OPEN_CMD := xdg-open
  RMRF := rm -rf
endif

# ── Sentinel files (for auto-install) ──────────────────
BACKEND_INSTALLED  := backend/.installed
FRONTEND_INSTALLED := frontend/node_modules/.package-lock.json

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
	@touch $(BACKEND_INSTALLED)

install-frontend: check-node ## Install frontend dependencies
	cd frontend && $(NPM) install

# Auto-install backend deps if sentinel is missing
$(BACKEND_INSTALLED): backend/requirements.txt
	@echo "Backend dependencies not installed. Running install..."
	cd backend && $(PIP) install -r requirements.txt
	@touch $(BACKEND_INSTALLED)

# Auto-install frontend deps if node_modules is missing
$(FRONTEND_INSTALLED): frontend/package.json
	@echo "Frontend dependencies not installed. Running install..."
	cd frontend && $(NPM) install

# ── Dev mode (with hot-reload) ───────────────────────────

dev: check-python check-node $(BACKEND_INSTALLED) $(FRONTEND_INSTALLED) ## Start backend and frontend in dev mode (parallel)
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: check-python $(BACKEND_INSTALLED) ## Start backend in dev mode (uvicorn --reload)
	cd backend && $(PYTHON) run.py

dev-frontend: check-node $(FRONTEND_INSTALLED) ## Start frontend in dev mode (next dev)
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn dev
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm dev
else
	cd frontend && npx --yes next dev
endif

# ── Production ───────────────────────────────────────────

start: start-backend start-frontend ## Start backend and frontend in production mode

start-backend: check-python $(BACKEND_INSTALLED) ## Start backend in production mode
	cd backend && $(PYTHON) -m uvicorn app.main:app --host 0.0.0.0 --port 8000

start-frontend: check-node $(FRONTEND_INSTALLED) ## Start frontend in production mode
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn start
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm start
else
	cd frontend && npx --yes next start
endif

build: check-node $(FRONTEND_INSTALLED) ## Build frontend for production
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn build
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm build
else
	cd frontend && npx --yes next build
endif

# ── Quality ──────────────────────────────────────────────

lint: check-node $(FRONTEND_INSTALLED) ## Run frontend linter
ifeq ($(NPM_NAME),yarn)
	cd frontend && yarn lint
else ifeq ($(NPM_NAME),pnpm)
	cd frontend && pnpm lint
else
	cd frontend && npm run lint
endif

test: check-python $(BACKEND_INSTALLED) ## Run backend tests
	cd backend && $(PYTHON) -m pytest

# ── Database ─────────────────────────────────────────────

migrate: check-python $(BACKEND_INSTALLED) ## Run database migrations
	cd backend && $(PYTHON) -m alembic upgrade head

migrate-new: check-python $(BACKEND_INSTALLED) ## Create a new migration (usage: make migrate-new MSG="description")
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
	rm -f $(BACKEND_INSTALLED)
	@echo "Cleaned build artifacts and caches."
