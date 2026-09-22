import os
from celery import Celery

# Configure Celery to use RabbitMQ as the broker and Redis as the result backend
broker_url = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "voxedit",
    broker=broker_url,
    backend=result_backend,
    include=["tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1, # Ensure tasks are evenly distributed
    task_track_started=True
)
