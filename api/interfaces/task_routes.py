import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from flask import Blueprint, jsonify, request

from interfaces.database_routes import get_token_from_header, get_user_from_token

task_routes = Blueprint('task_routes', __name__, url_prefix='/api/tasks')

ALLOWED_STATUSES = {'pending', 'in_progress', 'completed'}
ALLOWED_PRIORITIES = {'low', 'medium', 'high'}
DB_PATH = Path(__file__).resolve().parent.parent / 'data' / 'tasks.db'


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                due_date TEXT NOT NULL,
                college_id TEXT,
                college_name TEXT,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            'CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date)'
        )


def row_to_task(row: sqlite3.Row) -> dict[str, Any]:
    return {
        'id': row['id'],
        'user_id': row['user_id'],
        'title': row['title'],
        'description': row['description'],
        'due_date': row['due_date'],
        'college_id': row['college_id'],
        'college_name': row['college_name'],
        'status': row['status'],
        'priority': row['priority'],
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
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

    return user_id, None


@task_routes.route('', methods=['GET'])
def list_tasks():
    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    status = request.args.get('status')
    college_id = request.args.get('college_id')

    query = 'SELECT * FROM tasks WHERE user_id = ?'
    params: list[Any] = [user_id]
    if status:
        query += ' AND status = ?'
        params.append(status)
    if college_id:
        query += ' AND COALESCE(college_id, "") = ?'
        params.append(str(college_id))
    query += ' ORDER BY due_date ASC, created_at ASC'

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
    filtered = [row_to_task(row) for row in rows]
    return jsonify({'tasks': filtered}), 200


@task_routes.route('', methods=['POST'])
def create_task():
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

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO tasks (
                id, user_id, title, description, due_date, college_id, college_name,
                status, priority, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task['id'],
                task['user_id'],
                task['title'],
                task['description'],
                task['due_date'],
                task['college_id'],
                task['college_name'],
                task['status'],
                task['priority'],
                task['created_at'],
                task['updated_at'],
            ),
        )
    return jsonify({'message': 'Task created successfully', 'task': task}), 201


@task_routes.route('/<string:task_id>', methods=['PUT'])
def update_task(task_id: str):
    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    payload = request.get_json(silent=True) or {}
    with get_connection() as connection:
        row = connection.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            (task_id, user_id),
        ).fetchone()
        if not row:
            return jsonify({'error': 'Task not found'}), 404
        target = row_to_task(row)

    if 'status' in payload:
        status_error = validate_status(payload.get('status'))
        if status_error:
            return jsonify({'error': status_error}), 400

    if 'priority' in payload:
        priority_error = validate_priority(payload.get('priority'))
        if priority_error:
            return jsonify({'error': priority_error}), 400

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
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE tasks
            SET title = ?, description = ?, due_date = ?, college_id = ?, college_name = ?,
                status = ?, priority = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                target['title'],
                target['description'],
                target['due_date'],
                target['college_id'],
                target['college_name'],
                target['status'],
                target['priority'],
                target['updated_at'],
                task_id,
                user_id,
            ),
        )
    return jsonify({'message': 'Task updated successfully', 'task': target}), 200


@task_routes.route('/<string:task_id>', methods=['DELETE'])
def delete_task(task_id: str):
    user_id, auth_response = get_authenticated_user_id()
    if auth_response:
        return auth_response

    with get_connection() as connection:
        cursor = connection.execute(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            (task_id, user_id),
        )
    if cursor.rowcount == 0:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify({'message': 'Task deleted successfully'}), 200


init_db()
