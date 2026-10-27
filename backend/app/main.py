import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.api import health, environment, limits, catalog, jobs, experiments
from backend.app.services.environment import get_environment_info

# Max body size middleware (16 KB hard limit)
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 16384:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error": {
                        "code": "BODY_TOO_LARGE",
                        "message": "Request payload exceeds 16 KB limit",
                        "hint": "Reduce array sizes or simplify payload parameters."
                    }
                }
            )
        return await call_next(request)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup banner
    env = get_environment_info()
    port = int(os.environ.get("PORT", "8000"))
    dev_port = int(os.environ.get("VITE_PORT", "5173"))
    print("=" * 64)
    print("  THREADFORGE v2: Concurrency & Race Condition Laboratory")
    print("=" * 64)
    print(f"  OS:              {env.os_name} ({env.os_version})")
    print(f"  Python:          {env.python_version} ({env.python_implementation})")
    print(f"  GIL Status:      {'ENABLED' if env.gil_enabled else 'FREE-THREADED'}")
    print(f"  Physical Cores:  {env.cpu_count}")
    print(f"  Backend API:     http://localhost:{port}/api")
    print(f"  Dev Frontend:    http://localhost:{dev_port}")
    print(f"  Single-Port App: http://localhost:{port}")
    print("=" * 64)
    yield

app = FastAPI(
    title="ThreadForge Laboratory API",
    version="2.0.0",
    description="Interactive Multithreading Performance and Race Condition Laboratory Backend",
    lifespan=lifespan
)

# Enforce 16 KB request limit
app.add_middleware(RequestSizeLimitMiddleware)

# CORS: allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import HTTPException

# Uniform error response format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(detail),
                "hint": "Check request parameters."
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_err = errors[0] if errors else {}
    loc = ".".join(str(x) for x in first_err.get("loc", []))
    msg = first_err.get("msg", "Invalid parameter")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"Validation failed at '{loc}': {msg}",
                "hint": "Check field types, limits and allowed values."
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(exc) or "Unexpected server error",
                "hint": "Server state remains intact. Check logs or retry."
            }
        }
    )

# Include API routes
app.include_router(health.router, prefix="/api", tags=["System"])
app.include_router(environment.router, prefix="/api", tags=["System"])
app.include_router(limits.router, prefix="/api", tags=["System"])
app.include_router(catalog.router, prefix="/api", tags=["Experiments"])
app.include_router(jobs.router, prefix="/api", tags=["Jobs"])
app.include_router(experiments.router, prefix="/api", tags=["Experiments"])

# Serve frontend production bundle if built
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Don't intercept API calls
    if full_path.startswith("api"):
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "NOT_FOUND", "message": f"API endpoint /{full_path} not found"}}
        )
    file_path = frontend_dist / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index_path = frontend_dist / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse(
        status_code=200,
        content={"message": "ThreadForge API running. Build frontend with 'npm run build' for single-port production mode."}
    )
