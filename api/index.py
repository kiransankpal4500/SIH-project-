"""
Vercel Serverless Function Entrypoint
Bridges Vercel Serverless Python runtime to OceanScope FastAPI Application.
"""

import sys
import os
from pathlib import Path

# Ensure OceanScope/backend is in sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "OceanScope" / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Also ensure backend app directory is accessible
app_dir = backend_dir / "app"
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

from main import app

# Export app for Vercel WSGI/ASGI serverless runner
__all__ = ["app"]
