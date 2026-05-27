import redis.asyncio as aioredis
from app.config import settings

async def get_redis_client():
    return await aioredis.from_url(settings.redis_url, decode_responses=True)
