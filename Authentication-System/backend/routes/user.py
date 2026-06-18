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
from backend.models import (
    UserRegister, UserLogin, Token, UserResponse,
    RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest,
    UpdateProfileRequest
)
from fastapi import APIRouter, HTTPException, Header, Request, UploadFile, File
import uuid
import os
from fastapi import APIRouter, HTTPException, Header, Request, UploadFile, File, Response

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
def login(request: Request, user: UserLogin, response: Response):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": db_user["email"]})
    refresh_token = create_refresh_token(data={"sub": db_user["email"]})

    # ─── SET HTTP-ONLY COOKIES ────────────────────────────────────────────────
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,        # JavaScript CANNOT read this — key security feature!
        max_age=30 * 60,       # 30 minutes (in seconds)
        samesite="none",        # Protects against CSRF attacks
        secure=True             # Set to True when using HTTPS in production
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,    # 7 days (in seconds)
        samesite="none",
        secure=True 
    )

    # We still return the tokens in the body too (optional, but harmless)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# ─── REFRESH TOKEN (Get a new access token) ──────────────────────────────────
@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, response: Response):
    # 1. Read refresh token from the COOKIE (not the request body anymore)
    token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(status_code=401, detail="No refresh token found")

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Refresh token is invalid or expired")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    email = payload.get("sub")

    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access_token = create_access_token(data={"sub": email})
    new_refresh_token = create_refresh_token(data={"sub": email})

    # Set new cookies
    response.set_cookie(
        key="access_token", value=new_access_token,
        httponly=True, max_age=30 * 60, samesite="none", secure=True 
    )
    response.set_cookie(
        key="refresh_token", value=new_refresh_token,
        httponly=True, max_age=7 * 24 * 60 * 60, samesite="none", secure=True 
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

# ─── get me ──────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_me(request: Request):
    email = get_current_user(request)

    db_user = users_collection.find_one({"email": email})

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": str(db_user["_id"]),
        "username": db_user["username"],
        "email": db_user["email"],
        "profile_pic": db_user.get("profile_pic")
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


# ─── HELPER: Get logged-in user from COOKIE ──────────────────────────────────
def get_current_user(request: Request):
    """Reads the access_token cookie, verifies it, and returns the user's email."""
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token is invalid or expired")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    return payload.get("sub")

# ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
@router.put("/update", response_model=UserResponse)
def update_profile(body: UpdateProfileRequest, request: Request):
    email = get_current_user(request)

    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_fields = {}

    # 2. Handle username change
    if body.username:
        update_fields["username"] = body.username

    # 3. Handle password change (requires current password)
    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")

        if not verify_password(body.current_password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        update_fields["password"] = hash_password(body.new_password)

    # 4. If nothing was submitted to change
    if not update_fields:
        raise HTTPException(status_code=400, detail="Nothing to update")

    # 5. Update in MongoDB
    users_collection.update_one({"email": email}, {"$set": update_fields})

    # 6. Return the updated user
    updated_user = users_collection.find_one({"email": email})
    return {
        "id": str(updated_user["_id"]),
        "username": updated_user["username"],
        "email": updated_user["email"]
    }

# ─── ALLOWED IMAGE TYPES & MAX SIZE ──────────────────────────────────────────
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}
MAX_FILE_SIZE_MB = 5


# ─── UPLOAD PROFILE PICTURE ───────────────────────────────────────────────────
@router.post("/upload-profile-pic", response_model=UserResponse)
async def upload_profile_pic(
    file: UploadFile = File(...),
    request: Request = None
):
    email = get_current_user(request)

    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Check the file extension is allowed
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPG, PNG, and GIF are allowed."
        )

    # 3. Read the file content and check size
    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)

    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB."
        )

    # 4. Generate a UNIQUE filename so users don't overwrite each other's photos
    #    e.g. "a1b2c3d4-5678-90ab-cdef.jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = f"backend/static/profile_pics/{unique_filename}"

    # 5. Save the file to disk
    with open(file_path, "wb") as f:
        f.write(contents)

    # 6. Build the URL the frontend will use to display the image
    image_url = f"/static/profile_pics/{unique_filename}"

    # 7. Save the URL in MongoDB
    users_collection.update_one(
        {"email": email},
        {"$set": {"profile_pic": image_url}}
    )

    # 8. Return updated user
    updated_user = users_collection.find_one({"email": email})
    return {
        "id": str(updated_user["_id"]),
        "username": updated_user["username"],
        "email": updated_user["email"],
        "profile_pic": updated_user.get("profile_pic")
    }

# ─── LOGOUT (Clear cookies) ───────────────────────────────────────────────────
@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}