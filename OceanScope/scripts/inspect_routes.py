import sys
import os

sys.path.insert(0, os.path.abspath("OceanScope/backend"))

from main import app

print(f"App title: {app.title}")
print(f"Docs URL: {app.docs_url}")
print(f"OpenAPI URL: {app.openapi_url}")
print(f"Redoc URL: {app.redoc_url}")
print("\n=== All Registered FastAPI Routes ===")
for r in app.routes:
    methods = getattr(r, "methods", set())
    path = getattr(r, "path", str(r))
    print(f"{list(methods) if methods else 'MOUNT/WS'}: {path}")
