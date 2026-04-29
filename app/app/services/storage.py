"""S3-compatible object storage for game cover images."""

import logging

from aiobotocore.session import get_session
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

_S3_SESSION = get_session()


class ImageNotFound(Exception):
    """Raised when an image is not present in object storage."""


def _get_client():
    return _S3_SESSION.create_client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name="us-east-1",
    )


def _object_key(game_id: int, filename: str) -> str:
    return f"games/{game_id}/{filename}"


def get_public_url(game_id: int) -> str:
    """Construct the in-app proxy URL for a game image (relative to the app origin)."""
    return f"/api/games/{game_id}/image"


async def upload_image(
    game_id: int, filename: str, contents: bytes, content_type: str
) -> str:
    """Upload an image to S3 and return its in-app proxy URL."""
    key = _object_key(game_id, filename)
    async with _get_client() as client:
        await client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=contents,
            ContentType=content_type,
        )
    return get_public_url(game_id)


async def delete_image(game_id: int, filename: str) -> None:
    """Delete an image from S3."""
    key = _object_key(game_id, filename)
    async with _get_client() as client:
        await client.delete_object(Bucket=settings.s3_bucket, Key=key)


async def fetch_image(game_id: int, filename: str) -> tuple[bytes, str | None]:
    """Read a game image from S3, returning (body, content_type)."""
    key = _object_key(game_id, filename)
    async with _get_client() as client:
        try:
            obj = await client.get_object(Bucket=settings.s3_bucket, Key=key)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("NoSuchKey", "404"):
                raise ImageNotFound(key) from e
            raise
        body = await obj["Body"].read()
        return body, obj.get("ContentType")


def _session_object_key(session_id: int, filename: str) -> str:
    return f"sessions/{session_id}/{filename}"


def get_session_image_url(session_id: int, image_id: int) -> str:
    """Construct the in-app proxy URL for a session image (relative to the app origin)."""
    return f"/api/sessions/{session_id}/images/{image_id}"


async def upload_session_image(
    session_id: int, filename: str, contents: bytes, content_type: str
) -> None:
    """Upload a session image to S3."""
    key = _session_object_key(session_id, filename)
    async with _get_client() as client:
        await client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=contents,
            ContentType=content_type,
        )


async def delete_session_image(session_id: int, filename: str) -> None:
    """Delete a session image from S3."""
    key = _session_object_key(session_id, filename)
    async with _get_client() as client:
        await client.delete_object(Bucket=settings.s3_bucket, Key=key)


async def fetch_session_image(
    session_id: int, filename: str
) -> tuple[bytes, str | None]:
    """Read a session image from S3, returning (body, content_type)."""
    key = _session_object_key(session_id, filename)
    async with _get_client() as client:
        try:
            obj = await client.get_object(Bucket=settings.s3_bucket, Key=key)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("NoSuchKey", "404"):
                raise ImageNotFound(key) from e
            raise
        body = await obj["Body"].read()
        return body, obj.get("ContentType")


async def ensure_bucket() -> None:
    """Create the bucket if it doesn't exist. Bucket stays private — images are served via the app."""
    async with _get_client() as client:
        try:
            await client.head_bucket(Bucket=settings.s3_bucket)
            logger.info("S3 bucket '%s' already exists", settings.s3_bucket)
        except ClientError:
            await client.create_bucket(Bucket=settings.s3_bucket)
            logger.info("Created S3 bucket '%s'", settings.s3_bucket)
