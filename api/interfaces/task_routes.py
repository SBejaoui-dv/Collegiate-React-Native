from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import requests
from flask import Blueprint, jsonify, request

from interfaces.database_routes import (
    SUPABASE_URL,
    get_service_headers,
    get_token_from_header,
    get_user_from_token,
)

task_routes = Blueprint('task_routes', __name__, url_prefix='/api/tasks')

ALLOWED_STATUSES = {'pending', 'in_progress', 'completed'}
ALLOWED_PRIORITIES = {'low', 'medium', 'high'}
TASKS_TABLE = 'tasks'


def ensure_supabase_config() -> str | None:
    if not SUPABASE_URL:
        return 'Backend missing Supabase URL. Set SUPABASE_URL in api/.env.'
    return None


def row_to_task(row: dict[str, Any]) -> dict[str, Any]:
    return {
        'id': row.get('id'),
        'user_id': row.get('user_id'),
        'title': row.get('title'),
        'description': row.get('description'),
        'due_date': row.get('due_date'),
        'college_id': row.get('college_id'),
        'college_name': row.get('college_name'),
        'status': row.get('status'),
        'priority': row.get('priority'),
        'created_at': row.get('created_at'),
        'updated_at': row.get('updated_at'),
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_status(status: str | None) -> str | None:
    if status is None:
        return None
    if status not in ALLOWED_STATUSES:
        return 'status must be one of pending, in_progress, completed.'
    return None


def validate_priority(priority: str | None) -> str | None:
    if priority is None:
        return None
    if priority not in ALLOWED_PRIORITIES:
        return 'priority must be one of low, medium, high.'
    return None


def get_authenticated_user_id() -> tuple[str | None, tuple[Any, int] | None]:
    token = get_token_from_header()
    if not token:
        return None, (jsonify({'error': 'No token provided'}), 401)

    user, auth_error = get_user_from_token(token)
    if not user:
        return None, (jsonify({'error': auth_error or 'Invalid auth token'}), 401)

    user_id = user.get('id')
    if not user_id:
        return None, (jsonify({'error': 'Supabase auth payload missing user id.'}), 401)

    return str(user_id), None


def supabase_error_message(response: requests.Response) -> str:
    payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
    return payload.get('message') or payload.get('error') or response.text or f'HTTP {response.status_code}'


@task_routes.route('', methods=['GET'])
def list_tasks():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    status = request.args.get('status')
    college_id = request.args.get('college_id')

    params = {
        'user_id': f'eq.{user_id}',
        'select': 'id,user_id,title,description,due_date,college_id,college_name,status,priority,created_at,updated_at',
        'order': 'due_date.asc.nullslast,created_at.asc.nullslast',
    }
    if status:
        params['status'] = f'eq.{status}'
    if college_id:
        params['college_id'] = f'eq.{college_id}'

    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/{TASKS_TABLE}',
            headers=get_service_headers(),
            params=params,
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to load tasks: {supabase_error_message(response)}'}), 500

        rows = response.json() if response.content else []
        return jsonify({'tasks': [row_to_task(row) for row in rows]}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@task_routes.route('', methods=['POST'])
def create_task():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    payload = request.get_json(silent=True) or {}
    title = (payload.get('title') or '').strip()
    due_date = (payload.get('due_date') or '').strip()
    status = payload.get('status', 'pending')
    priority = payload.get('priority', 'medium')

    if not title or not due_date:
        return jsonify({'error': 'Title and due_date are required'}), 400

    status_error = validate_status(status)
    if status_error:
        return jsonify({'error': status_error}), 400

    priority_error = validate_priority(priority)
    if priority_error:
        return jsonify({'error': priority_error}), 400

    timestamp = now_iso()
    task = {
        'id': str(uuid4()),
        'user_id': user_id,
        'title': title,
        'description': (payload.get('description') or '').strip(),
        'due_date': due_date,
        'college_id': payload.get('college_id') or None,
        'college_name': payload.get('college_name') or None,
        'status': status,
        'priority': priority,
        'created_at': timestamp,
        'updated_at': timestamp,
    }

    try:
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/{TASKS_TABLE}',
            headers={**get_service_headers(), 'Prefer': 'return=representation'},
            json=task,
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to create task: {supabase_error_message(response)}'}), 500

        created = response.json()[0] if response.content else task
        return jsonify({'message': 'Task created successfully', 'task': row_to_task(created)}), 201
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@task_routes.route('/<string:task_id>', methods=['PUT'])
def update_task(task_id: str):
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    payload = request.get_json(silent=True) or {}

    if 'status' in payload:
        status_error = validate_status(payload.get('status'))
        if status_error:
            return jsonify({'error': status_error}), 400

    if 'priority' in payload:
        priority_error = validate_priority(payload.get('priority'))
        if priority_error:
            return jsonify({'error': priority_error}), 400

    try:
        fetch_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/{TASKS_TABLE}',
            headers=get_service_headers(),
            params={
                'id': f'eq.{task_id}',
                'user_id': f'eq.{user_id}',
                'select': 'id,user_id,title,description,due_date,college_id,college_name,status,priority,created_at,updated_at',
                'limit': '1',
            },
            timeout=15,
        )
        if not fetch_response.ok:
            return jsonify({'error': f'Failed to load task: {supabase_error_message(fetch_response)}'}), 500
        existing_rows = fetch_response.json() if fetch_response.content else []
        if not existing_rows:
            return jsonify({'error': 'Task not found'}), 404
        target = row_to_task(existing_rows[0])

        for key in ['title', 'description', 'due_date', 'college_id', 'college_name', 'status', 'priority']:
            if key in payload:
                value = payload.get(key)
                if key in {'college_id', 'college_name'}:
                    target[key] = value or None
                elif key in {'title', 'description', 'due_date'} and isinstance(value, str):
                    target[key] = value.strip()
                else:
                    target[key] = value

        target['updated_at'] = now_iso()

        update_response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/{TASKS_TABLE}',
            headers={**get_service_headers(), 'Prefer': 'return=representation'},
            params={
                'id': f'eq.{task_id}',
                'user_id': f'eq.{user_id}',
            },
            json={
                'title': target['title'],
                'description': target['description'],
                'due_date': target['due_date'],
                'college_id': target['college_id'],
                'college_name': target['college_name'],
                'status': target['status'],
                'priority': target['priority'],
                'updated_at': target['updated_at'],
            },
            timeout=15,
        )
        if not update_response.ok:
            return jsonify({'error': f'Failed to update task: {supabase_error_message(update_response)}'}), 500

        updated_rows = update_response.json() if update_response.content else []
        if not updated_rows:
            return jsonify({'error': 'Task not found'}), 404

        return jsonify({'message': 'Task updated successfully', 'task': row_to_task(updated_rows[0])}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@task_routes.route('/<string:task_id>', methods=['DELETE'])
def delete_task(task_id: str):
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    try:
        response = requests.delete(
            f'{SUPABASE_URL}/rest/v1/{TASKS_TABLE}',
            headers={**get_service_headers(), 'Prefer': 'return=representation'},
            params={
                'id': f'eq.{task_id}',
                'user_id': f'eq.{user_id}',
            },
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to delete task: {supabase_error_message(response)}'}), 500

        deleted_rows = response.json() if response.content else []
        if not deleted_rows:
            return jsonify({'error': 'Task not found'}), 404

        return jsonify({'message': 'Task deleted successfully'}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500
