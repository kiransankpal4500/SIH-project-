"""
High-Performance In-Memory Query Cache with TTL and Hit/Miss Tracking
"""

import time
import threading
import logging
from typing import Dict, Tuple, Any, Optional

logger = logging.getLogger("oceanscope.cache")


class QueryCache:
    def __init__(self, default_ttl_seconds: int = 300, max_entries: int = 2000):
        self.default_ttl = default_ttl_seconds
        self.max_entries = max_entries
        self._cache: Dict[str, Tuple[float, Any, int]] = {}  # key -> (timestamp, data, ttl)
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0
        self.evictions = 0

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value from cache if present and not expired."""
        now = time.time()
        with self._lock:
            if key in self._cache:
                ts, val, ttl = self._cache[key]
                if now - ts < ttl:
                    self.hits += 1
                    return val
                else:
                    del self._cache[key]
                    self.evictions += 1
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store value in cache with TTL and enforce max capacity."""
        now = time.time()
        ttl_val = ttl if ttl is not None else self.default_ttl
        with self._lock:
            if len(self._cache) >= self.max_entries:
                # Evict 20% oldest entries
                sorted_keys = sorted(self._cache.keys(), key=lambda k: self._cache[k][0])
                evict_count = max(1, int(len(sorted_keys) * 0.2))
                for k in sorted_keys[:evict_count]:
                    del self._cache[k]
                    self.evictions += 1

            self._cache[key] = (now, value, ttl_val)

    def clear(self) -> None:
        """Clear entire cache."""
        with self._lock:
            self._cache.clear()
            self.hits = 0
            self.misses = 0
            self.evictions = 0

    def stats(self) -> Dict[str, Any]:
        """Return cache performance statistics."""
        with self._lock:
            total = self.hits + self.misses
            hit_ratio = round((self.hits / total) * 100, 2) if total > 0 else 0.0
            return {
                "active_entries": len(self._cache),
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio_percent": hit_ratio,
                "evictions": self.evictions,
                "max_entries": self.max_entries,
                "default_ttl_seconds": self.default_ttl,
            }


# Global Singleton Cache Instance
global_query_cache = QueryCache(default_ttl_seconds=300, max_entries=2000)
