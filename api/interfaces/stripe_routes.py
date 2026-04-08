import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import stripe
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request

from interfaces.database_routes import get_token_from_header, get_user_from_token

API_ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(API_ENV_PATH)

stripe_routes = Blueprint('stripe_routes', __name__, url_prefix='/api/stripe')

SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY', '').strip()
if not SUPABASE_SECRET_KEY:
    SUPABASE_SECRET_KEY = os.getenv('SUPABASE_KEY', '').strip()

STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '').strip()
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '').strip()
STRIPE_PRICE_ID = os.getenv('STRIPE_PRICE_ID', '').strip()
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8081').rstrip('/')

stripe.api_key = STRIPE_SECRET_KEY


def _ensure_config() -> str | None:
    if not STRIPE_SECRET_KEY:
        return 'Missing STRIPE_SECRET_KEY in api/.env.'
    if not STRIPE_PRICE_ID:
        return 'Missing STRIPE_PRICE_ID in api/.env.'
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        return 'Missing SUPABASE_URL or SUPABASE_SECRET_KEY in api/.env.'
    return None


def _supabase_headers() -> dict[str, str]:
    return {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': f'Bearer {SUPABASE_SECRET_KEY}',
        'Content-Type': 'application/json',
    }


def _supabase_select_subscription_by_user(user_id: str) -> dict[str, Any] | None:
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/subscriptions',
        headers=_supabase_headers(),
        params={
            'user_id': f'eq.{user_id}',
            'select': 'user_id,plan,status,current_period_end,stripe_customer_id,stripe_subscription_id',
            'limit': '1',
        },
        timeout=15,
    )
    if not response.ok:
        return None
    rows = response.json() if response.content else []
    return rows[0] if rows else None


def _supabase_select_subscription_by_customer(customer_id: str) -> dict[str, Any] | None:
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/subscriptions',
        headers=_supabase_headers(),
        params={
            'stripe_customer_id': f'eq.{customer_id}',
            'select': 'user_id,plan,status,current_period_end,stripe_customer_id,stripe_subscription_id',
            'limit': '1',
        },
        timeout=15,
    )
    if not response.ok:
        return None
    rows = response.json() if response.content else []
    return rows[0] if rows else None


def _supabase_upsert_subscription(row: dict[str, Any]) -> bool:
    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/subscriptions',
        headers={**_supabase_headers(), 'Prefer': 'resolution=merge-duplicates,return=representation'},
        params={'on_conflict': 'user_id'},
        json=row,
        timeout=15,
    )
    return response.ok


def _require_user() -> tuple[str | None, str | None]:
    token = get_token_from_header()
    if not token:
        return None, 'Authentication required.'
    user, auth_error = get_user_from_token(token)
    if not user:
        return None, auth_error or 'Invalid auth token.'
    user_id = user.get('id')
    if not user_id:
        return None, 'Supabase auth payload missing user id.'
    return str(user_id), None


def _ts_to_iso(timestamp: Any) -> str | None:
    if timestamp is None:
        return None
    try:
        return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()
    except (ValueError, TypeError):
        return None


def _get_subscription_period(subscription: dict[str, Any]) -> tuple[str | None, str | None]:
    try:
        items = subscription.get('items', {}).get('data', [])
        first_item = items[0] if items else {}
        return _ts_to_iso(first_item.get('current_period_start')), _ts_to_iso(
            first_item.get('current_period_end')
        )
    except Exception:
        return None, None


def _get_or_create_customer(user_id: str, email: str) -> str:
    existing = _supabase_select_subscription_by_user(user_id)
    if existing and existing.get('stripe_customer_id'):
        return str(existing['stripe_customer_id'])

    customer = stripe.Customer.create(
        email=email,
        metadata={'supabase_user_id': user_id},
    )

    _supabase_upsert_subscription(
        {
            'user_id': user_id,
            'stripe_customer_id': customer.id,
            'plan': 'free',
            'status': 'active',
        }
    )
    return customer.id


def _sync_if_expired(user_id: str, row: dict[str, Any]) -> dict[str, Any]:
    period_end_str = row.get('current_period_end')
    if period_end_str:
        try:
            period_end = datetime.fromisoformat(str(period_end_str))
            if period_end.tzinfo is None:
                period_end = period_end.replace(tzinfo=timezone.utc)
            if datetime.now(tz=timezone.utc) < period_end:
                return row
        except (ValueError, TypeError):
            pass

    stripe_subscription_id = row.get('stripe_subscription_id')
    if not stripe_subscription_id:
        return row

    try:
        sub = stripe.Subscription.retrieve(stripe_subscription_id)
        stripe_status = sub.get('status', 'canceled')
        plan = 'premium' if stripe_status in ('active', 'trialing') else 'free'
        period_start, period_end = _get_subscription_period(sub)
        updates = {
            'user_id': user_id,
            'plan': plan,
            'status': stripe_status,
            'current_period_start': period_start,
            'current_period_end': period_end,
            'stripe_subscription_id': sub.get('id'),
        }
        _supabase_upsert_subscription(updates)
        return {**row, **updates}
    except Exception:
        return row


def _handle_checkout_completed(session: dict[str, Any]) -> None:
    customer_id = session.get('customer')
    subscription_id = session.get('subscription')
    metadata = session.get('metadata') or {}
    user_id = metadata.get('supabase_user_id')

    if not user_id and customer_id:
        row = _supabase_select_subscription_by_customer(str(customer_id))
        if row:
            user_id = row.get('user_id')

    if not user_id or not subscription_id:
        return

    sub = stripe.Subscription.retrieve(subscription_id)
    period_start, period_end = _get_subscription_period(sub)

    _supabase_upsert_subscription(
        {
            'user_id': user_id,
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription_id,
            'plan': 'premium',
            'status': 'active',
            'current_period_start': period_start,
            'current_period_end': period_end,
        }
    )


def _handle_subscription_updated(subscription: dict[str, Any]) -> None:
    customer_id = subscription.get('customer')
    if not customer_id:
        return

    existing = _supabase_select_subscription_by_customer(str(customer_id))
    if not existing:
        return

    user_id = existing.get('user_id')
    status = subscription.get('status', 'canceled')
    plan = 'premium' if status in ('active', 'trialing') else 'free'
    period_start, period_end = _get_subscription_period(subscription)

    _supabase_upsert_subscription(
        {
            'user_id': user_id,
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription.get('id'),
            'plan': plan,
            'status': status,
            'current_period_start': period_start,
            'current_period_end': period_end,
        }
    )


def _handle_subscription_deleted(subscription: dict[str, Any]) -> None:
    customer_id = subscription.get('customer')
    if not customer_id:
        return

    existing = _supabase_select_subscription_by_customer(str(customer_id))
    if not existing:
        return

    _supabase_upsert_subscription(
        {
            'user_id': existing.get('user_id'),
            'stripe_customer_id': customer_id,
            'plan': 'free',
            'status': 'canceled',
            'stripe_subscription_id': None,
        }
    )


def _handle_payment_failed(invoice: dict[str, Any]) -> None:
    customer_id = invoice.get('customer')
    if not customer_id:
        return

    existing = _supabase_select_subscription_by_customer(str(customer_id))
    if not existing:
        return

    _supabase_upsert_subscription(
        {
            'user_id': existing.get('user_id'),
            'stripe_customer_id': customer_id,
            'status': 'past_due',
        }
    )


@stripe_routes.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    config_error = _ensure_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_error = _require_user()
    if auth_error:
        return jsonify({'error': auth_error}), 401

    payload = request.get_json(silent=True) or {}
    email = (payload.get('email') or '').strip()
    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    try:
        customer_id = _get_or_create_customer(user_id, email)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{'price': STRIPE_PRICE_ID, 'quantity': 1}],
            mode='subscription',
            success_url=f'{FRONTEND_URL}/premium?status=success&session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{FRONTEND_URL}/premium?status=canceled',
            metadata={'supabase_user_id': user_id},
        )
        return jsonify({'url': session.url, 'session_id': session.id}), 200
    except Exception:
        return jsonify({'error': 'Failed to create checkout session.'}), 500


@stripe_routes.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    config_error = _ensure_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_error = _require_user()
    if auth_error:
        return jsonify({'error': auth_error}), 401

    try:
        row = _supabase_select_subscription_by_user(user_id)
        customer_id = row.get('stripe_customer_id') if row else None
        if not customer_id:
            return jsonify({'error': 'No subscription found.'}), 404

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f'{FRONTEND_URL}/premium',
        )
        return jsonify({'url': session.url}), 200
    except Exception:
        return jsonify({'error': 'Failed to create portal session.'}), 500


@stripe_routes.route('/subscription-status', methods=['GET'])
def get_subscription_status():
    config_error = _ensure_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_error = _require_user()
    if auth_error:
        return jsonify({'error': auth_error}), 401

    try:
        row = _supabase_select_subscription_by_user(user_id)
        if not row:
            return (
                jsonify(
                    {
                        'plan': 'free',
                        'status': 'active',
                        'is_premium': False,
                        'current_period_end': None,
                        'has_subscription': False,
                    }
                ),
                200,
            )

        if row.get('plan') == 'premium' and row.get('stripe_subscription_id'):
            row = _sync_if_expired(user_id, row)

        plan = row.get('plan') or 'free'
        status = row.get('status') or 'active'
        is_premium = plan == 'premium' and status in ('active', 'trialing')
        return (
            jsonify(
                {
                    'plan': plan,
                    'status': status,
                    'is_premium': is_premium,
                    'current_period_end': row.get('current_period_end'),
                    'has_subscription': bool(row.get('stripe_subscription_id')),
                }
            ),
            200,
        )
    except Exception:
        return jsonify({'error': 'Failed to fetch subscription status.'}), 500


@stripe_routes.route('/webhook', methods=['POST'])
def stripe_webhook():
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify({'error': 'Missing STRIPE_WEBHOOK_SECRET in api/.env.'}), 500

    payload = request.data
    signature = request.headers.get('Stripe-Signature', '')

    try:
        event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400

    event_type = event.get('type')
    data_object = (event.get('data') or {}).get('object') or {}
    handlers = {
        'checkout.session.completed': _handle_checkout_completed,
        'customer.subscription.updated': _handle_subscription_updated,
        'customer.subscription.deleted': _handle_subscription_deleted,
        'invoice.payment_failed': _handle_payment_failed,
    }

    handler = handlers.get(event_type)
    if handler:
        try:
            handler(data_object)
        except Exception:
            return jsonify({'error': 'Webhook handler failed'}), 500

    return jsonify({'received': True}), 200
