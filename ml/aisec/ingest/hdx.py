"""Humanitarian Data Exchange (HDX) API helper."""

from __future__ import annotations

from typing import Any

from .http import HttpClient

HDX_API = "https://data.humdata.org/api/3/action"


class HDXClient:
    def __init__(self, http: HttpClient | None = None) -> None:
        self._owns_http = http is None
        self.http = http or HttpClient(min_interval=0.5)

    def close(self) -> None:
        if self._owns_http:
            self.http.close()

    def __enter__(self) -> "HDXClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def package_show(self, dataset_id: str) -> dict[str, Any]:
        response = self.http.get(f"{HDX_API}/package_show", params={"id": dataset_id})
        payload = response.json()
        if not payload.get("success"):
            raise RuntimeError(f"HDX package_show failed for {dataset_id}: {payload}")
        return payload["result"]

    def package_search(self, query: str, rows: int = 20) -> list[dict[str, Any]]:
        response = self.http.get(
            f"{HDX_API}/package_search", params={"q": query, "rows": rows}
        )
        payload = response.json()
        if not payload.get("success"):
            raise RuntimeError(f"HDX package_search failed: {payload}")
        return payload["result"]["results"]

    def resources(self, dataset_id: str) -> list[dict[str, Any]]:
        return list(self.package_show(dataset_id).get("resources", []))

    def find_resource(
        self,
        dataset_id: str,
        formats: tuple[str, ...] = (),
        name_contains: str | None = None,
    ) -> dict[str, Any]:
        resources = self.resources(dataset_id)
        wanted = {value.lower() for value in formats}
        candidates = []
        for resource in resources:
            fmt = str(resource.get("format", "")).lower()
            name = str(resource.get("name", "")).lower()
            if wanted and fmt not in wanted:
                continue
            if name_contains and name_contains.lower() not in name:
                continue
            candidates.append(resource)
        if not candidates:
            raise LookupError(
                f"No HDX resource in {dataset_id} matched formats={formats} name={name_contains}"
            )
        # Prefer national resources over state-level extracts.
        candidates.sort(key=lambda item: (("state" in item.get("name", "").lower()), -(item.get("size") or 0)))
        return candidates[0]

    def download_resource(self, resource: dict[str, Any]) -> str:
        url = resource.get("url") or resource.get("download_url")
        if not url:
            raise ValueError(f"Resource has no URL: {resource}")
        return str(url)
