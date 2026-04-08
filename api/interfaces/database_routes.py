import os
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request
from pathlib import Path

API_ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(API_ENV_PATH)

database_routes = Blueprint('database_routes', __name__, url_prefix='/api/database')

SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_SECRET_KEY = os.getenv('SUPABASE_SECRET_KEY', '')
# Allow fallback to frontend-style env names to reduce local setup friction.
if not SUPABASE_URL:
    SUPABASE_URL = os.getenv('EXPO_PUBLIC_SUPABASE_URL', '').rstrip('/')
if not SUPABASE_KEY:
    SUPABASE_KEY = os.getenv('EXPO_PUBLIC_SUPABASE_ANON_KEY', '')
if not SUPABASE_KEY:
    SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', '')
if not SUPABASE_SECRET_KEY:
    SUPABASE_SECRET_KEY = SUPABASE_KEY


def get_token_from_header() -> str | None:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ', 1)[1].strip()


def get_user_from_token(token: str) -> tuple[dict[str, Any] | None, str | None]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None, 'Backend missing Supabase env values.'

    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {token}',
            },
            timeout=10,
        )
        if not response.ok:
            error_payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            message = error_payload.get('msg') or error_payload.get('message') or response.text
            return None, f'Supabase auth check failed ({response.status_code}): {message}'
        payload = response.json()
        if not payload.get('id'):
            return None, 'Supabase auth payload missing user id.'
        return payload, None
    except requests.RequestException as exc:
        return None, f'Unable to reach Supabase auth endpoint: {exc}'


def get_service_headers() -> dict[str, str]:
    return {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': f'Bearer {SUPABASE_SECRET_KEY}',
        'Content-Type': 'application/json',
    }


def normalize_college_input(college_data: dict[str, Any]) -> dict[str, Any]:
    latest = college_data.get('latest', {})
    school = latest.get('school', {})

    # Accept both current normalized RN shape and nested shape.
    college_name = school.get('name') or college_data.get('name')
    city = school.get('city') or college_data.get('city')
    state = school.get('state') or college_data.get('state')
    school_url = school.get('school_url') or college_data.get('website')

    return {
        'college_name': college_name,
        'city': city,
        'state': state,
        'school_url': school_url,
        'student_size': latest.get('student', {}).get('size') or college_data.get('studentSize'),
        'tuition_in_state': latest.get('cost', {}).get('tuition', {}).get('in_state')
        or college_data.get('tuitionInState'),
        'tuition_out_of_state': latest.get('cost', {}).get('tuition', {}).get('out_of_state')
        or college_data.get('tuitionOutOfState'),
        'admission_rate': latest.get('admissions', {}).get('admission_rate', {}).get('overall')
        or college_data.get('acceptanceRate'),
    }


@database_routes.route('/insert', methods=['POST'])
def insert_college():
    token = get_token_from_header()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    if not SUPABASE_URL or not SUPABASE_KEY:
        return jsonify({'error': 'Backend missing Supabase env. Set SUPABASE_URL and SUPABASE_KEY in api/.env.'}), 500

    user, auth_error = get_user_from_token(token)
    if not user:
        return jsonify({'error': auth_error or 'Invalid auth token'}), 401

    college_data = request.get_json(silent=True) or {}
    normalized = normalize_college_input(college_data)

    if not normalized.get('college_name'):
        return jsonify({'error': 'College name is required'}), 400

    user_id = user['id']

    try:
        duplicate_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_colleges',
            headers=get_service_headers(),
            params={
                'user_id': f'eq.{user_id}',
                'college_name': f"eq.{normalized['college_name']}",
                'state': f"eq.{normalized.get('state') or ''}",
                'select': 'id,college_name,city,state,school_url,student_size,tuition_in_state,tuition_out_of_state,admission_rate',
                'limit': '1',
            },
            timeout=15,
        )
        if duplicate_response.ok:
            duplicates = duplicate_response.json() if duplicate_response.content else []
            if duplicates:
                return jsonify({'message': 'College already saved', 'data': duplicates[0]}), 200

        insert_payload = {'user_id': user_id, **normalized}
        insert_response = requests.post(
            f'{SUPABASE_URL}/rest/v1/user_colleges',
            headers={**get_service_headers(), 'Prefer': 'return=representation'},
            json=insert_payload,
            timeout=15,
        )
        if not insert_response.ok:
            error_payload = (
                insert_response.json()
                if insert_response.headers.get('content-type', '').startswith('application/json')
                else {}
            )
            message = error_payload.get('message') or error_payload.get('error') or insert_response.text
            return jsonify({'error': f'Failed to save college: {message}'}), 500

        inserted = insert_response.json()[0] if insert_response.content else insert_payload
        return jsonify({'message': 'College saved successfully', 'data': inserted}), 201
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@database_routes.route('/list', methods=['GET'])
def get_saved_colleges():
    token = get_token_from_header()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    if not SUPABASE_URL or not SUPABASE_KEY:
        return jsonify({'error': 'Backend missing Supabase env. Set SUPABASE_URL and SUPABASE_KEY in api/.env.'}), 500

    user, auth_error = get_user_from_token(token)
    if not user:
        return jsonify({'error': auth_error or 'Invalid auth token'}), 401

    user_id = user['id']
    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_colleges',
            headers=get_service_headers(),
            params={
                'user_id': f'eq.{user_id}',
                'select': 'id,college_name,city,state,school_url,student_size,tuition_in_state,tuition_out_of_state,admission_rate',
                'order': 'created_at.asc.nullslast,college_name.asc',
            },
            timeout=15,
        )
        if not response.ok:
            error_payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            message = error_payload.get('message') or error_payload.get('error') or response.text
            return jsonify({'error': f'Failed to load colleges: {message}'}), 500

        return jsonify({'colleges': response.json() if response.content else []})
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@database_routes.route('/delete/<string:college_id>', methods=['DELETE'])
def delete_saved_college(college_id: str):
    token = get_token_from_header()
    if not token:
        return jsonify({'error': 'No token provided'}), 401

    if not SUPABASE_URL or not SUPABASE_KEY:
        return jsonify({'error': 'Backend missing Supabase env. Set SUPABASE_URL and SUPABASE_KEY in api/.env.'}), 500

    user, auth_error = get_user_from_token(token)
    if not user:
        return jsonify({'error': auth_error or 'Invalid auth token'}), 401

    user_id = user['id']
    try:
        response = requests.delete(
            f'{SUPABASE_URL}/rest/v1/user_colleges',
            headers={**get_service_headers(), 'Prefer': 'return=representation'},
            params={
                'id': f'eq.{college_id}',
                'user_id': f'eq.{user_id}',
            },
            timeout=15,
        )
        if not response.ok:
            error_payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            message = error_payload.get('message') or error_payload.get('error') or response.text
            return jsonify({'error': f'Failed to remove college: {message}'}), 500

        deleted_rows = response.json() if response.content else []
        if not deleted_rows:
            return jsonify({'error': 'College not found'}), 404

        return jsonify({'message': 'College removed successfully'})
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500
