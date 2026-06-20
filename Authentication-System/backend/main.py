import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from backend.database import close_db, connect_to_db
from backend.routes.user import router as user_router

# ─── LOGGING SETUP ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── RATE LIMITER ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ─── LIFESPAN (startup / shutdown) ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to MongoDB on startup, close connection on shutdown."""
    logger.info("Starting up Authentication API...")
    await connect_to_db()
    yield
    logger.info("Shutting down Authentication API...")
    await close_db()


# ─── APP ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Authentication System API",
    description=(
        "Production-ready JWT authentication backend built with FastAPI and MongoDB. "
        "Features: registration, login, token refresh, password reset, profile management."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "https://authentication-system-omega-vert.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── REQUEST LOGGING MIDDLEWARE ───────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# ─── ROUTERS ──────────────────────────────────────────────────────────────────
app.include_router(user_router, prefix="/api/users", tags=["Users"])


# ─── ROUTES ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    return {"message": "Authentication API is running!", "version": "1.0.0", "docs": "/api/docs"}


@app.get("/health", tags=["Root"])
async def health_check():
    """Health check endpoint — verifies API and MongoDB connectivity."""
    from backend import database as db_module
    try:
        await db_module.client.admin.command("ping")
        return {"status": "ok", "db": "connected", "version": "1.0.0"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "db": str(e)},
        )