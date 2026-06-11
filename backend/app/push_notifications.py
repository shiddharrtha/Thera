from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def fetch_expo_push_token(user_id: str) -> str | None:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }
    params = {
        "id": f"eq.{user_id}",
        "select": "expo_push_token",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        rows = response.json()

    if not rows:
        return None

    token = rows[0].get("expo_push_token")
    return token if isinstance(token, str) and token.strip() else None


async def fetch_field_name(field_id: str) -> str | None:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/fields"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }
    params = {
        "id": f"eq.{field_id}",
        "select": "name",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        rows = response.json()

    if not rows:
        return None

    name = rows[0].get("name")
    return name if isinstance(name, str) and name.strip() else None


async def send_expo_push(
    token: str,
    *,
    title: str,
    body: str,
    data: dict[str, str],
) -> None:
    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data,
        "channelId": "scan-reports",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            EXPO_PUSH_URL,
            json=[message],
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        result = response.json()
        tickets = result.get("data")
        if isinstance(tickets, list) and tickets and tickets[0].get("status") == "error":
            logger.warning("Expo push error: %s", tickets[0])


async def maybe_send_scan_complete_push(
    *,
    user_id: str,
    scan_id: str,
    field_id: str,
) -> None:
    try:
        token = await fetch_expo_push_token(user_id)
        if not token:
            return

        field_name = await fetch_field_name(field_id)
        label = field_name or "field"

        await send_expo_push(
            token,
            title="Field report ready",
            body=f"Your {label} scan has been analyzed.",
            data={
                "type": "scan_complete",
                "scanId": scan_id,
                "fieldId": field_id,
            },
        )
    except Exception as exc:
        logger.warning("Scan complete push failed for %s: %s", scan_id, exc)
