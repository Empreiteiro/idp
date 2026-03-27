"""API routes for dependency management — list, validate, and install."""

import asyncio
import platform
import subprocess
import sys
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.rate_limit import limiter
from app.services.deps_validator import validate_dependencies

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


class InstallRequest(BaseModel):
    name: str
    type: str  # "python" or "system"


class InstallResult(BaseModel):
    status: str
    message: str
    output: str = ""


def _detect_os() -> dict:
    """Return info about the host operating system."""
    os_name = platform.system().lower()  # 'linux', 'darwin', 'windows'
    return {
        "os": os_name,
        "os_display": {
            "linux": "Linux",
            "darwin": "macOS",
            "windows": "Windows",
        }.get(os_name, os_name),
        "arch": platform.machine(),
        "python": sys.version,
    }


# Map system tool -> install commands per OS
SYSTEM_INSTALL_COMMANDS: dict[str, dict[str, list[str]]] = {
    "tesseract": {
        "darwin": ["brew", "install", "tesseract"],
        "linux": ["sudo", "apt-get", "install", "-y", "tesseract-ocr"],
        "windows": ["choco", "install", "tesseract", "-y"],
    },
    "poppler": {
        "darwin": ["brew", "install", "poppler"],
        "linux": ["sudo", "apt-get", "install", "-y", "poppler-utils"],
        "windows": ["choco", "install", "poppler", "-y"],
    },
}


@router.get("")
def list_dependencies():
    """Return all dependencies with their status plus OS info."""
    result = validate_dependencies()
    return {
        **asdict(result),
        "os_info": _detect_os(),
    }


@router.post("/install", response_model=InstallResult)
@limiter.limit("3/minute")
async def install_dependency(body: InstallRequest, request: Request):
    """Install a single dependency.

    For Python packages: uses pip install.
    For system tools: uses the OS-appropriate package manager.
    """
    os_name = platform.system().lower()

    if body.type == "python":
        cmd = [sys.executable, "-m", "pip", "install", body.name]
    elif body.type == "system":
        commands = SYSTEM_INSTALL_COMMANDS.get(body.name)
        if not commands:
            raise HTTPException(400, f"No install command known for system tool '{body.name}'")
        cmd = commands.get(os_name)
        if not cmd:
            raise HTTPException(
                400,
                f"No install command for '{body.name}' on {os_name}. Please install it manually.",
            )
    else:
        raise HTTPException(400, f"Unknown dependency type: {body.type}")

    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if proc.returncode == 0:
            return InstallResult(
                status="ok",
                message=f"'{body.name}' installed successfully",
                output=proc.stdout[-500:] if proc.stdout else "",
            )
        else:
            return InstallResult(
                status="error",
                message=f"Installation failed (exit code {proc.returncode})",
                output=(proc.stderr or proc.stdout or "")[-500:],
            )
    except subprocess.TimeoutExpired:
        return InstallResult(status="error", message="Installation timed out after 120 seconds")
    except FileNotFoundError as e:
        return InstallResult(
            status="error",
            message=f"Package manager not found: {e}. Please install the dependency manually.",
        )
    except Exception as e:
        return InstallResult(status="error", message=str(e))
