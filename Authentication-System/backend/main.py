from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.user import router as user_router

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ─── RATE LIMITER SETUP ────────────────────────────────────────────────────────
# This tracks requests by IP address
limiter = Limiter(key_func=get_remote_address)

# Create the FastAPI app
app = FastAPI(title="Authentication System")

# Attach the limiter to our app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS SETUP ───────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── REGISTER ROUTES ──────────────────────────────────────────────────────────
app.include_router(user_router, prefix="/api/users", tags=["Users"])


# ─── ROOT ENDPOINT ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Authentication API is running!"}