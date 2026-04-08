"""S3-compatible object storage for game cover images."""

import json
import logging

from aiobotocore.session import get_session
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

_S3_SESSION = get_session()


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


def get_public_url(game_id: int, filename: str) -> str:
    """Construct the public URL for a game image."""
    key = _object_key(game_id, filename)
    return f"{settings.s3_public_url}/{settings.s3_bucket}/{key}"


async def upload_image(
    game_id: int, filename: str, contents: bytes, content_type: str
) -> str:
    """Upload an image to S3 and return its public URL."""
    key = _object_key(game_id, filename)
    async with _get_client() as client:
        await client.put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=contents,
            ContentType=content_type,
        )
    return get_public_url(game_id, filename)


async def delete_image(game_id: int, filename: str) -> None:
    """Delete an image from S3."""
    key = _object_key(game_id, filename)
    async with _get_client() as client:
        await client.delete_object(Bucket=settings.s3_bucket, Key=key)


async def ensure_bucket() -> None:
    """Create the bucket if it doesn't exist and set public-read policy."""
    async with _get_client() as client:
        try:
            await client.head_bucket(Bucket=settings.s3_bucket)
            logger.info("S3 bucket '%s' already exists", settings.s3_bucket)
        except ClientError:
            await client.create_bucket(Bucket=settings.s3_bucket)
            logger.info("Created S3 bucket '%s'", settings.s3_bucket)

        policy = json.dumps(
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": "s3:GetObject",
                        "Resource": f"arn:aws:s3:::{settings.s3_bucket}/*",
                    }
                ],
            }
        )
        await client.put_bucket_policy(Bucket=settings.s3_bucket, Policy=policy)
