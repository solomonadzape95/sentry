"""Polite HTTP client with an on-disk response cache.

Every request is cached under data/raw/_cache. The cache is deliberately
content-addressed so repeated pipeline runs are cheap and auditable.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .base import CACHE_DIR, ensure_dir, iso, sha256_bytes, utc_now

USER_AGENT = "ChetaDataPipeline/0.1 (+https://cheta.health; data@cheta.health)"


@dataclass
class CachedResponse:
    url: str
    status_code: int
    content: bytes
    headers: dict[str, str]
    from_cache: bool
    cache_path: Path

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", errors="replace")

    def json(self) -> Any:
        return json.loads(self.text)


class HttpClient:
    def __init__(
        self,
        cache_dir: Path = CACHE_DIR,
        timeout: float = 60.0,
        min_interval: float = 0.4,
        refresh: bool = False,
    ) -> None:
        self.cache_dir = ensure_dir(cache_dir)
        self.timeout = timeout
        self.min_interval = min_interval
        self.refresh = refresh
        self._last_request = 0.0
        self._client = httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def _cache_key(self, url: str) -> str:
        return sha256_bytes(url.encode("utf-8"))[:2] + "/" + sha256_bytes(url.encode("utf-8"))

    def _cache_paths(self, url: str) -> tuple[Path, Path]:
        key = self._cache_key(url)
        return self.cache_dir / f"{key}.bin", self.cache_dir / f"{key}.json"

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last_request = time.monotonic()

    @retry(
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    def _fetch(self, url: str, headers: dict[str, str] | None = None) -> httpx.Response:
        self._throttle()
        response = self._client.get(url, headers=headers)
        response.raise_for_status()
        return response

    def get(
        self,
        url: str,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        refresh: bool | None = None,
    ) -> CachedResponse:
        if params:
            joiner = "&" if "?" in url else "?"
            url = f"{url}{joiner}{urlencode(params, doseq=True)}"
        body_path, meta_path = self._cache_paths(url)
        use_refresh = self.refresh if refresh is None else refresh
        if body_path.exists() and meta_path.exists() and not use_refresh:
            meta = json.loads(meta_path.read_text())
            return CachedResponse(
                url=url,
                status_code=int(meta.get("status_code", 200)),
                content=body_path.read_bytes(),
                headers=meta.get("headers", {}),
                from_cache=True,
                cache_path=body_path,
            )

        response = self._fetch(url, headers=headers)
        ensure_dir(body_path.parent)
        body_path.write_bytes(response.content)
        meta = {
            "url": url,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "fetched_at": iso(utc_now()),
            "sha256": sha256_bytes(response.content),
            "content_type": response.headers.get("content-type"),
        }
        meta_path.write_text(json.dumps(meta, indent=2) + "\n")
        return CachedResponse(
            url=url,
            status_code=response.status_code,
            content=response.content,
            headers=dict(response.headers),
            from_cache=False,
            cache_path=body_path,
        )

    def download(self, url: str, destination: Path, refresh: bool | None = None) -> Path:
        response = self.get(url, refresh=refresh)
        ensure_dir(destination.parent)
        if destination.exists() and not (self.refresh if refresh is None else refresh):
            return destination
        destination.write_bytes(response.content)
        return destination
