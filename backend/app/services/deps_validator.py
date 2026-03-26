"""Validate that all required packages for document extraction are installed."""

import importlib
import shutil
import subprocess
from dataclasses import dataclass, field


@dataclass
class DepStatus:
    name: str
    required: bool
    installed: bool
    version: str = ""
    detail: str = ""


@dataclass
class ValidationResult:
    ok: bool
    python_packages: list[DepStatus] = field(default_factory=list)
    system_tools: list[DepStatus] = field(default_factory=list)
    summary: str = ""


# Python packages required for document extraction
REQUIRED_PYTHON_PACKAGES = [
    ("pdfplumber", "pdfplumber", True, "PDF text extraction (digital PDFs)"),
    ("pymupdf", "fitz", True, "PDF rendering and image conversion"),
    ("pytesseract", "pytesseract", False, "Tesseract OCR Python wrapper"),
    ("pdf2image", "pdf2image", False, "PDF to image conversion (legacy fallback)"),
    ("Pillow", "PIL", True, "Image processing"),
    ("openai", "openai", False, "OpenAI API client"),
    ("anthropic", "anthropic", False, "Anthropic (Claude) API client"),
    ("google-genai", "google.genai", False, "Google Gemini API client"),
    ("mistralai", "mistralai", False, "Mistral AI OCR client"),
    ("fastapi", "fastapi", True, "Web framework"),
    ("uvicorn", "uvicorn", True, "ASGI server"),
    ("sqlalchemy", "sqlalchemy", True, "Database ORM"),
    ("pydantic-settings", "pydantic_settings", True, "Settings management"),
    ("python-multipart", "multipart", True, "Form/file upload handling"),
    ("python-dotenv", "dotenv", True, "Environment variable loading"),
    ("aiofiles", "aiofiles", True, "Async file operations"),
]


def _get_package_version(import_name: str) -> str:
    """Try to get the version of an installed package."""
    try:
        mod = importlib.import_module(import_name)
        for attr in ("__version__", "VERSION", "version"):
            v = getattr(mod, attr, None)
            if v:
                return str(v)
    except Exception:
        pass

    # Fallback: use importlib.metadata
    try:
        from importlib.metadata import version

        # Map import names back to distribution names
        dist_map = {
            "fitz": "pymupdf",
            "PIL": "Pillow",
            "google.genai": "google-genai",
            "dotenv": "python-dotenv",
            "pydantic_settings": "pydantic-settings",
        }
        dist_name = dist_map.get(import_name, import_name)
        return version(dist_name)
    except Exception:
        return ""


def _check_python_package(pkg_name: str, import_name: str) -> tuple[bool, str]:
    """Check if a Python package is importable and return its version."""
    try:
        importlib.import_module(import_name)
        ver = _get_package_version(import_name)
        return True, ver
    except ImportError:
        return False, ""


def _check_tesseract() -> tuple[bool, str]:
    """Check if Tesseract OCR binary is available."""
    # Check via pytesseract first
    try:
        import pytesseract

        ver = pytesseract.get_tesseract_version()
        return True, str(ver)
    except Exception:
        pass

    # Fallback: check PATH
    path = shutil.which("tesseract")
    if path:
        try:
            result = subprocess.run(
                [path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            first_line = result.stdout.strip().split("\n")[0]
            return True, first_line
        except Exception:
            return True, "found but version unknown"
    return False, ""


def _check_poppler() -> tuple[bool, str]:
    """Check if Poppler (pdftotext/pdftoppm) is available."""
    for cmd in ("pdftoppm", "pdftotext"):
        path = shutil.which(cmd)
        if path:
            try:
                result = subprocess.run(
                    [path, "-v"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                output = (result.stdout or result.stderr).strip().split("\n")[0]
                return True, output
            except Exception:
                return True, "found but version unknown"
    return False, ""


def validate_dependencies() -> ValidationResult:
    """Run full validation of all dependencies needed for document extraction."""
    python_deps: list[DepStatus] = []
    missing_required = 0

    for pkg_name, import_name, required, detail in REQUIRED_PYTHON_PACKAGES:
        installed, version = _check_python_package(pkg_name, import_name)
        if not installed and required:
            missing_required += 1
        python_deps.append(
            DepStatus(
                name=pkg_name,
                required=required,
                installed=installed,
                version=version,
                detail=detail,
            )
        )

    # System tools
    system_deps: list[DepStatus] = []

    tess_ok, tess_ver = _check_tesseract()
    system_deps.append(
        DepStatus(
            name="tesseract",
            required=False,
            installed=tess_ok,
            version=tess_ver,
            detail="OCR engine for scanned documents",
        )
    )

    pop_ok, pop_ver = _check_poppler()
    system_deps.append(
        DepStatus(
            name="poppler",
            required=False,
            installed=pop_ok,
            version=pop_ver,
            detail="PDF rendering tools (legacy fallback)",
        )
    )

    all_ok = missing_required == 0

    installed_count = sum(1 for d in python_deps if d.installed)
    total_count = len(python_deps)

    if all_ok:
        summary = (
            f"All required packages installed ({installed_count}/{total_count} Python packages). "
            "System is ready for document extraction."
        )
    else:
        missing = [d.name for d in python_deps if not d.installed and d.required]
        summary = (
            f"Missing {missing_required} required package(s): {', '.join(missing)}. "
            "Run: pip install -r requirements.txt"
        )

    return ValidationResult(
        ok=all_ok,
        python_packages=python_deps,
        system_tools=system_deps,
        summary=summary,
    )
