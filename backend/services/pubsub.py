import os
import json
import redis
import redis.asyncio as aioredis
import asyncio

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
PUBSUB_CHANNEL = "voxedit_updates"

# Sync redis client for Celery workers to publish messages
sync_redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def publish_update(task_id: str, message: dict):
    """
    Publish an update to the Redis pubsub channel.
    Used by Celery workers to broadcast progress.
    """
    payload = {
        "task_id": task_id,
        "data": message
    }
    sync_redis_client.publish(PUBSUB_CHANNEL, json.dumps(payload))


async def listen_for_updates(websocket_manager):
    """
    Listen to the Redis pubsub channel and broadcast to all connected WebSockets.
    Used by the FastAPI main thread.
    """
    try:
        async_redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        pubsub = async_redis_client.pubsub()
        await pubsub.subscribe(PUBSUB_CHANNEL)
        
        print(f"🎧 Subscribed to Redis Pub/Sub channel: {PUBSUB_CHANNEL}")
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    payload = json.loads(message["data"])
                    task_data = payload.get("data", {})
                    # Broadcast the data to all active websockets
                    await websocket_manager.broadcast(task_data)
                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    print(f"Error broadcasting message: {e}")
                    
    except Exception as e:
        print(f"Redis Pub/Sub Connection Error: {e}")
