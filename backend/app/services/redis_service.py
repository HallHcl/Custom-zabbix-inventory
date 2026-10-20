import asyncio
import json
from typing import Any, Dict, List, Optional
import redis.asyncio as aioredis
from backend.app.config import settings


class RedisService:
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def get_client(self) -> aioredis.Redis:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._client is None or self._loop != current_loop:
            self._loop = current_loop
            self._client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    async def close(self):
        if self._client is not None:
            await self._client.close()
            self._client = None
            self._loop = None

    async def set_json(self, key: str, value: Any, ttl: int = 60):
        client = self.get_client()
        await client.set(key, json.dumps(value), ex=ttl)

    async def get_json(self, key: str) -> Optional[Any]:
        client = self.get_client()
        val = await client.get(key)
        if val:
            try:
                return json.loads(val)
            except Exception:
                return None
        return None

    async def mget_json(self, keys: List[str]) -> List[Optional[Any]]:
        if not keys:
            return []
        client = self.get_client()
        raw_vals = await client.mget(keys)
        results = []
        for v in raw_vals:
            if v:
                try:
                    results.append(json.loads(v))
                except Exception:
                    results.append(None)
            else:
                results.append(None)
        return results

    # High-level domain helpers
    async def cache_host_summary(self, host_id: str, data: Dict[str, Any], ttl: int = 60):
        await self.set_json(f"zabbix:host:{host_id}:summary", data, ttl=ttl)

    async def get_hosts_summaries(self, host_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        keys = [f"zabbix:host:{hid}:summary" for hid in host_ids]
        items = await self.mget_json(keys)
        result = {}
        for hid, item in zip(host_ids, items):
            if item:
                result[hid] = item
        return result

    async def cache_active_problems(self, problems: List[Dict[str, Any]], ttl: int = 30):
        await self.set_json("zabbix:active_problems", problems, ttl=ttl)

    async def get_active_problems(self) -> Optional[List[Dict[str, Any]]]:
        return await self.get_json("zabbix:active_problems")

    async def cache_unassigned_hosts(self, data: Dict[str, Any], ttl: int = 60):
        await self.set_json("zabbix:unassigned_hosts", data, ttl=ttl)

    async def get_unassigned_hosts(self) -> Optional[Dict[str, Any]]:
        return await self.get_json("zabbix:unassigned_hosts")

    async def invalidate_unassigned_hosts(self):
        client = self.get_client()
        await client.delete("zabbix:unassigned_hosts")



redis_service = RedisService()
