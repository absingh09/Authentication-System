"""
storage.py — Profile picture upload abstraction.

- If CLOUDINARY_CLOUD_NAME env var is set → uploads to Cloudinary CDN (persistent).
- Otherwise → saves to backend/static/profile_pics/ (local dev only, ephemeral on Render).
"""

import os
import uuid
import logging

logger = logging.getLogger(__name__)

# ─── MAGIC BYTES — MIME VALIDATION ────────────────────────────────────────────
# Maps file magic bytes (first N bytes) to allowed MIME types.
# This prevents users from uploading a renamed .php or .html as a .jpg.
MAGIC_SIGNATURES: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
}


def verify_image_mime(contents: bytes) -> bool:
    """Return True only if the file's actual content matches an allowed image type."""
    for signature in MAGIC_SIGNATURES:
        if contents[: len(signature)] == signature:
            return True
    return False


# ─── CLOUDINARY SETUP (optional) ──────────────────────────────────────────────
USE_CLOUDINARY = bool(os.getenv("CLOUDINARY_CLOUD_NAME"))

if USE_CLOUDINARY:
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )
        logger.info("Cloudinary storage configured.")
    except ImportError:
        logger.warning("cloudinary package not installed — falling back to local storage.")
        USE_CLOUDINARY = False


# ─── UPLOAD FUNCTION ──────────────────────────────────────────────────────────
async def upload_profile_picture(contents: bytes, file_ext: str) -> str:
    """
    Upload a profile picture and return the public URL.

    Production (Cloudinary):  Returns a persistent CDN HTTPS URL.
    Local dev (fallback):     Saves to disk, returns a /static/... relative path.
    """
    if USE_CLOUDINARY:
        import cloudinary.uploader

        public_id = f"profile_pics/{uuid.uuid4()}"
        result = cloudinary.uploader.upload(
            contents,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            # Auto-crop to square, face-aware — great for avatars
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face", "quality": "auto"}
            ],
        )
        url: str = result["secure_url"]
        logger.info(f"Profile picture uploaded to Cloudinary: {public_id}")
        return url
    else:
        # Local fallback — will be lost on Render redeploy
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        save_dir = "backend/static/profile_pics"
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, unique_filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        logger.info(f"Profile picture saved locally: {file_path}")
        return f"/static/profile_pics/{unique_filename}"
