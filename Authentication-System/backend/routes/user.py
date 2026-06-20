import hashlib
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from backend import database as db_module
from backend.auth import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
)
from backend.email_utils import send_reset_email
from backend.models import (
    ForgotPasswordRequest,
    LogoutRequest,
    RefreshRequest,
    ResetPasswordRequest,
    Token,
    UpdateProfileRequest,
    UserLogin,
    UserRegister,
    UserResponse,
)
from backend.storage import upload_profile_picture, verify_image_mime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://authentication-system-omega-vert.vercel.app")

# ─── File upload constraints ──────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
MAX_FILE_SIZE_MB = 5


# ─── DEPENDENCY: get authenticated user email from Bearer token ───────────────
async def get_current_user(request: Request) -> str:
    """
    FastAPI Dependency. Reads the Authorization header, verifies the JWT,
    and returns the authenticated user's email.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not logged in. No Authorization header.")

    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format.")

    token = parts[1]
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired.")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type.")

    return payload.get("sub")


# ─── Helper: hash a refresh token for safe DB storage ────────────────────────
def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ─── Helper: store a new refresh token in DB ─────────────────────────────────
async def _store_refresh_token(email: str, refresh_token: str) -> None:
    expire = datetime.now(timezone.utc) + timedelta(days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")))
    await db_module.refresh_tokens_collection.insert_one({
        "token_hash": _hash_token(refresh_token),
        "user_email": email,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expire,
    })


# ─── REGISTER ────────────────────────────────────────────────────────────────
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, user: UserRegister):
    existing_user = await db_module.users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")

    # Also check username uniqueness
    existing_username = await db_module.users_collection.find_one({"username": user.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken.")

    new_user = {
        "username": user.username,
        "email": user.email,
        "password": hash_password(user.password),
        "profile_pic": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db_module.users_collection.insert_one(new_user)
    logger.info(f"New user registered: {user.email}")
    return {"message": "Account created successfully!", "id": str(result.inserted_id)}


# ─── LOGIN ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, user: UserLogin):
    db_user = await db_module.users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    access_token = create_access_token(data={"sub": db_user["email"]})
    refresh_token = create_refresh_token(data={"sub": db_user["email"]})

    # Persist refresh token hash in DB for revocation support
    await _store_refresh_token(db_user["email"], refresh_token)
    logger.info(f"User logged in: {db_user['email']}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ─── REFRESH TOKEN ───────────────────────────────────────────────────────────
@router.post("/refresh", response_model=Token)
async def refresh_token_endpoint(body: RefreshRequest):
    token = body.refresh_token

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Refresh token is invalid or expired.")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type.")

    # Verify this token hasn't been revoked
    token_hash = _hash_token(token)
    stored = await db_module.refresh_tokens_collection.find_one({"token_hash": token_hash})
    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked.")

    email = payload.get("sub")
    db_user = await db_module.users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Rotate tokens — invalidate old refresh token, issue new pair
    await db_module.refresh_tokens_collection.delete_one({"token_hash": token_hash})

    new_access_token = create_access_token(data={"sub": email})
    new_refresh_token = create_refresh_token(data={"sub": email})
    await _store_refresh_token(email, new_refresh_token)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


# ─── GET ME (current user profile) ───────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(email: str = Depends(get_current_user)):
    db_user = await db_module.users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "id": str(db_user["_id"]),
        "username": db_user["username"],
        "email": db_user["email"],
        "profile_pic": db_user.get("profile_pic"),
    }


# ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest):
    db_user = await db_module.users_collection.find_one({"email": body.email})

    # Anti-enumeration: always return the same message regardless of whether email exists
    if not db_user:
        return {"message": "If that email exists, a reset link has been sent."}

    # Create a single-use reset token (token + unique JTI)
    reset_token, jti = create_reset_token(data={"sub": body.email})

    # Store JTI in user document — only this JTI will be accepted for this reset
    await db_module.users_collection.update_one(
        {"email": body.email},
        {"$set": {"reset_jti": jti, "reset_requested_at": datetime.now(timezone.utc)}},
    )

    # Build reset link pointing to the React frontend (no .html)
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    try:
        await send_reset_email(body.email, reset_link)
    except Exception as e:
        logger.error(f"Failed to send reset email to {body.email}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Email delivery failed. Please check mail configuration.",
        )

    return {"message": "If that email exists, a reset link has been sent."}


# ─── RESET PASSWORD ──────────────────────────────────────────────────────────
@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    payload = decode_token(body.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired.")
    if payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid token type.")

    email = payload.get("sub")
    jti = payload.get("jti")

    # Find user AND verify JTI matches — enforces single-use reset links
    db_user = await db_module.users_collection.find_one({"email": email, "reset_jti": jti})
    if not db_user:
        raise HTTPException(status_code=400, detail="Reset link has already been used or is invalid.")

    # Update password and clear the JTI so this link cannot be reused
    await db_module.users_collection.update_one(
        {"email": email},
        {
            "$set": {"password": hash_password(body.new_password)},
            "$unset": {"reset_jti": "", "reset_requested_at": ""},
        },
    )

    # Revoke all active refresh tokens for this user (force re-login after password reset)
    await db_module.refresh_tokens_collection.delete_many({"user_email": email})

    logger.info(f"Password reset successfully for: {email}")
    return {"message": "Password reset successfully! You can now log in."}


# ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
@router.put("/update", response_model=UserResponse)
async def update_profile(body: UpdateProfileRequest, email: str = Depends(get_current_user)):
    db_user = await db_module.users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields: dict = {}

    if body.username:
        # Check new username not already taken by another user
        existing = await db_module.users_collection.find_one(
            {"username": body.username, "email": {"$ne": email}}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken.")
        update_fields["username"] = body.username

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required.")
        if not verify_password(body.current_password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect.")
        update_fields["password"] = hash_password(body.new_password)

    if not update_fields:
        raise HTTPException(status_code=400, detail="Nothing to update.")

    await db_module.users_collection.update_one({"email": email}, {"$set": update_fields})

    updated = await db_module.users_collection.find_one({"email": email})
    return {
        "id": str(updated["_id"]),
        "username": updated["username"],
        "email": updated["email"],
        "profile_pic": updated.get("profile_pic"),   # ← was missing before
    }


# ─── UPLOAD PROFILE PICTURE ──────────────────────────────────────────────────
@router.post("/upload-profile-pic", response_model=UserResponse)
async def upload_profile_pic(
    file: UploadFile = File(...),
    email: str = Depends(get_current_user),
):
    db_user = await db_module.users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Validate file extension
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and GIF are allowed.")

    # Read and check file size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Max allowed size is {MAX_FILE_SIZE_MB} MB.")

    # Validate MIME type via magic bytes (not just extension)
    if not verify_image_mime(contents):
        raise HTTPException(status_code=400, detail="File content does not match an allowed image type.")

    # Upload (Cloudinary in prod, local disk in dev)
    image_url = await upload_profile_picture(contents, file_ext)

    await db_module.users_collection.update_one(
        {"email": email},
        {"$set": {"profile_pic": image_url}},
    )

    updated = await db_module.users_collection.find_one({"email": email})
    return {
        "id": str(updated["_id"]),
        "username": updated["username"],
        "email": updated["email"],
        "profile_pic": updated.get("profile_pic"),
    }


# ─── LOGOUT ──────────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(body: LogoutRequest = None, email: str = Depends(get_current_user)):
    """
    Revokes the provided refresh token from the database.
    Even without a token, clears any expired tokens for this user.
    """
    if body and body.refresh_token:
        token_hash = _hash_token(body.refresh_token)
        result = await db_module.refresh_tokens_collection.delete_one({"token_hash": token_hash})
        if result.deleted_count:
            logger.info(f"Refresh token revoked for: {email}")

    return {"message": "Logged out successfully."}