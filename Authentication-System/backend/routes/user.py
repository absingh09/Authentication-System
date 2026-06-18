from fastapi import APIRouter, HTTPException, Header, Request
from backend.models import (
    UserRegister, UserLogin, Token, UserResponse,
    RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from backend.database import users_collection
from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_access_token
)
from backend.email_utils import send_reset_email
from bson import ObjectId
from typing import Optional
from dotenv import load_dotenv
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL")
limiter = Limiter(key_func=get_remote_address)


# ─── REGISTER ────────────────────────────────────────────────────────────────
@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, user: UserRegister):
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)

    new_user = {
        "username": user.username,
        "email": user.email,
        "password": hashed
    }
    result = users_collection.insert_one(new_user)

    return {"message": "Account created successfully!", "id": str(result.inserted_id)}


# ─── LOGIN ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create BOTH tokens now
    access_token = create_access_token(data={"sub": db_user["email"]})
    refresh_token = create_refresh_token(data={"sub": db_user["email"]})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# ─── REFRESH TOKEN (Get a new access token) ──────────────────────────────────
@router.post("/refresh", response_model=Token)
def refresh_token(body: RefreshRequest):
    # 1. Decode the refresh token
    payload = decode_access_token(body.refresh_token)

    if not payload:
        raise HTTPException(status_code=401, detail="Refresh token is invalid or expired")

    # 2. Make sure it's actually a REFRESH token (not an access token being reused)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    # 3. Get the user's email from the token
    email = payload.get("sub")

    # 4. Confirm user still exists
    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 5. Issue a brand NEW access token (and a new refresh token too)
    new_access_token = create_access_token(data={"sub": email})
    new_refresh_token = create_refresh_token(data={"sub": email})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


# ─── GET CURRENT USER (Protected Route) ──────────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    # Extra security: make sure this is an ACCESS token, not a refresh token
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    email = payload.get("sub")

    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(db_user["_id"]),
        "username": db_user["username"],
        "email": db_user["email"]
    }

# ─── FORGOT PASSWORD (Request a reset link) ──────────────────────────────────
@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest):
    # 1. Check if user exists
    db_user = users_collection.find_one({"email": body.email})

    # 🔒 Security note: we always return the SAME message whether the email
    # exists or not. This prevents attackers from using this endpoint to
    # discover which emails are registered in our system.
    if not db_user:
        return {"message": "If that email exists, a reset link has been sent."}

    # 2. Create a reset token containing the user's email
    reset_token = create_reset_token(data={"sub": body.email})

    # 3. Build the reset link
    reset_link = f"{FRONTEND_URL}/reset-password.html?token={reset_token}"

    # 4. Send the email
    await send_reset_email(body.email, reset_link)

    return {"message": "If that email exists, a reset link has been sent."}


# ─── RESET PASSWORD (Set new password using the token) ───────────────────────
@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    # 1. Decode the reset token
    payload = decode_access_token(body.token)

    if not payload:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")

    # 2. Make sure it's actually a RESET token
    if payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid token type")

    email = payload.get("sub")

    # 3. Confirm user still exists
    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 4. Hash the new password and update it in MongoDB
    new_hashed_password = hash_password(body.new_password)
    users_collection.update_one(
        {"email": email},
        {"$set": {"password": new_hashed_password}}
    )

    return {"message": "Password reset successfully! You can now login."}