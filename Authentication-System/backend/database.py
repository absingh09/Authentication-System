import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL")

# These are populated during app startup via connect_to_db()
client: AsyncIOMotorClient | None = None
users_collection = None
refresh_tokens_collection = None


async def connect_to_db():
    """Called during FastAPI lifespan startup. Initialises motor client and collections."""
    global client, users_collection, refresh_tokens_collection

    client = AsyncIOMotorClient(MONGODB_URL)
    db = client["authenticationdb"]
    users_collection = db["users"]
    refresh_tokens_collection = db["refresh_tokens"]

    # Verify connectivity
    await client.admin.command("ping")

    # Create indexes (idempotent)
    await users_collection.create_index("email", unique=True)
    await refresh_tokens_collection.create_index("expires_at", expireAfterSeconds=0)
    await refresh_tokens_collection.create_index("token_hash", unique=True)

    logger.info("MongoDB connected successfully.")


async def close_db():
    """Called during FastAPI lifespan shutdown."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")