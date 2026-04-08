import os
from datetime import date
from functools import wraps
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from flask import jsonify

from interfaces.database_routes import get_token_from_header, get_user_from_token

API_ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(API_ENV_PATH)

SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY', '').strip()
if not SUPABASE_SECRET_KEY:
    SUPABASE_SECRET_KEY = os.getenv('SUPABASE_KEY', '').strip()

DEFAULT_DAILY_LIMIT = int(os.getenv('FREE_DAILY_TOKEN_LIMIT', '5'))


def _supabase_headers() -> dict[str, str]:
    return {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': f'Bearer {SUPABASE_SECRET_KEY}',
        'Content-Type': 'application/json',
    }


def _is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SECRET_KEY)


def _select_subscription(user_id: str) -> dict[str, Any] | None:
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/subscriptions',
        headers=_supabase_headers(),
        params={
            'user_id': f'eq.{user_id}',
            'select': 'plan,status',
            'limit': '1',
        },
        timeout=15,
    )
    if not response.ok:
        return None
    rows = response.json() if response.content else []
    return rows[0] if rows else None


def _is_premium(user_id: str) -> bool:
    if not _is_configured():
        return False
    try:
        row = _select_subscription(user_id)
        if not row:
            return False
        return row.get('plan') == 'premium' and row.get('status') in ('active', 'trialing')
    except Exception:
        return False


def _select_today_tokens(user_id: str, usage_date: str) -> dict[str, Any] | None:
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/user_tokens',
        headers=_supabase_headers(),
        params={
            'user_id': f'eq.{user_id}',
            'usage_date': f'eq.{usage_date}',
            'select': 'user_id,usage_date,tokens_used,tokens_limit',
            'limit': '1',
        },
        timeout=15,
    )
    if not response.ok:
        return None
    rows = response.json() if response.content else []
    return rows[0] if rows else None


def _upsert_today_tokens(user_id: str, usage_date: str, tokens_used: int, tokens_limit: int) -> bool:
    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/user_tokens',
        headers={**_supabase_headers(), 'Prefer': 'resolution=merge-duplicates,return=representation'},
        params={'on_conflict': 'user_id,usage_date'},
        json={
            'user_id': user_id,
            'usage_date': usage_date,
            'tokens_used': tokens_used,
            'tokens_limit': tokens_limit,
        },
        timeout=15,
    )
    return response.ok


def _get_or_create_today_tokens(user_id: str) -> dict[str, Any]:
    today = date.today().isoformat()
    existing = _select_today_tokens(user_id, today)
    if existing:
        return existing

    _upsert_today_tokens(user_id, today, 0, DEFAULT_DAILY_LIMIT)
    return {
        'user_id': user_id,
        'usage_date': today,
        'tokens_used': 0,
        'tokens_limit': DEFAULT_DAILY_LIMIT,
    }


def _log_usage(user_id: str, feature: str, tokens_spent: int) -> None:
    try:
        requests.post(
            f'{SUPABASE_URL}/rest/v1/token_usage_log',
            headers={**_supabase_headers(), 'Prefer': 'return=minimal'},
            json={
                'user_id': user_id,
                'feature': feature,
                'tokens_spent': tokens_spent,
            },
            timeout=15,
        )
    except Exception:
        pass


def _deduct_tokens(user_id: str, cost: int, feature: str) -> None:
    row = _get_or_create_today_tokens(user_id)
    current_used = int(row.get('tokens_used') or 0)
    current_limit = int(row.get('tokens_limit') or DEFAULT_DAILY_LIMIT)

    _upsert_today_tokens(
        user_id=user_id,
        usage_date=date.today().isoformat(),
        tokens_used=current_used + cost,
        tokens_limit=current_limit,
    )
    _log_usage(user_id=user_id, feature=feature, tokens_spent=cost)


def get_token_status(user_id: str) -> dict[str, Any]:
    if _is_premium(user_id):
        return {
            'plan': 'premium',
            'is_premium': True,
            'tokens_used': 0,
            'tokens_limit': None,
            'tokens_remaining': None,
        }

    row = _get_or_create_today_tokens(user_id)
    used = int(row.get('tokens_used') or 0)
    limit = int(row.get('tokens_limit') or DEFAULT_DAILY_LIMIT)
    return {
        'plan': 'free',
        'is_premium': False,
        'tokens_used': used,
        'tokens_limit': limit,
        'tokens_remaining': max(0, limit - used),
    }


def _get_authenticated_user_id() -> str | None:
    token = get_token_from_header()
    if not token:
        return None
    user, auth_error = get_user_from_token(token)
    if not user or auth_error:
        return None
    user_id = user.get('id')
    return str(user_id) if user_id else None


def require_tokens(cost: int = 1, feature: str = 'unknown'):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = _get_authenticated_user_id()
            if not user_id:
                return jsonify({'error': 'Authentication required'}), 401

            if _is_premium(user_id):
                return fn(*args, **kwargs)

            status = get_token_status(user_id)
            remaining = int(status.get('tokens_remaining') or 0)
            if remaining < cost:
                return (
                    jsonify(
                        {
                            'error': 'Daily token limit reached',
                            'tokens_used': status.get('tokens_used'),
                            'tokens_limit': status.get('tokens_limit'),
                            'tokens_remaining': status.get('tokens_remaining'),
                            'upgrade_url': '/premium',
                        }
                    ),
                    429,
                )

            response = fn(*args, **kwargs)
            code = response[1] if isinstance(response, tuple) else response.status_code
            if 200 <= code < 300:
                _deduct_tokens(user_id=user_id, cost=cost, feature=feature)
            return response

        return wrapper

    return decorator
