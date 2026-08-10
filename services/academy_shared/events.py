"""Event bus for publishing domain events (Kafka/Redpanda)."""
from __future__ import annotations
import json
import logging

log = logging.getLogger(__name__)


class EventBus:
    """Publishes events to Kafka/Redpanda.  Silently skips if disabled or
    if the broker is unreachable -- event publishing is non-critical."""

    def __init__(self, enabled: bool = False, servers: str = "localhost:19092"):
        self._enabled = enabled
        self._servers = servers
        self._producer = None

    async def start(self) -> None:
        if not self._enabled:
            return
        try:
            from aiokafka import AIOKafkaProducer
            self._producer = AIOKafkaProducer(bootstrap_servers=self._servers)
            await self._producer.start()
            log.info("Kafka producer connected to %s", self._servers)
        except Exception as exc:
            log.warning("Kafka unavailable: %s", exc)
            self._producer = None

    async def stop(self) -> None:
        if self._producer:
            await self._producer.stop()
            self._producer = None

    async def publish(self, topic: str, payload: dict) -> None:
        if not self._enabled or not self._producer:
            return
        try:
            await self._producer.send_and_wait(
                topic, json.dumps(payload, default=str).encode("utf-8"),
            )
        except Exception:
            pass
