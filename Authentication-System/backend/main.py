from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routes.user import router as user_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Authentication System")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://authentication-system-omega-vert.vercel.app/"],   # ← Your exact frontend URL (Live Server)
    allow_credentials=True,                     # ← Required for cookies to work
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SERVE UPLOADED IMAGES ─────────────────────────────────────────────────────
# This makes anything in backend/static/ accessible via http://127.0.0.1:8000/static/...
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

app.include_router(user_router, prefix="/api/users", tags=["Users"])


@app.get("/")
def root():
    return {"message": "Authentication API is running!"}