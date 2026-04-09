from datetime import datetime, timezone
from typing import Any
import secrets

import requests
from flask import Blueprint, jsonify, request

from interfaces.database_routes import (
    SUPABASE_URL,
    get_service_headers,
    get_token_from_header,
    get_user_from_token,
)

counselor_routes = Blueprint('counselor_routes', __name__, url_prefix='/api/counselor')


def ensure_supabase_config() -> str | None:
    if not SUPABASE_URL:
        return 'Backend missing Supabase URL. Set SUPABASE_URL in api/.env.'
    return None


def supabase_error_message(response: requests.Response) -> str:
    payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
    return payload.get('message') or payload.get('error') or response.text or f'HTTP {response.status_code}'


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_authenticated_user() -> tuple[dict[str, Any] | None, tuple[Any, int] | None]:
    token = get_token_from_header()
    if not token:
        return None, (jsonify({'error': 'No token provided'}), 401)

    user, auth_error = get_user_from_token(token)
    if not user:
        return None, (jsonify({'error': auth_error or 'Invalid auth token'}), 401)

    return user, None


def get_counselor_user_id() -> tuple[str | None, tuple[Any, int] | None]:
    user, auth_response = get_authenticated_user()
    if auth_response:
        return None, auth_response

    user_id = str(user.get('id') or '')
    if not user_id:
        return None, (jsonify({'error': 'Supabase auth payload missing user id.'}), 401)

    metadata = user.get('user_metadata') or {}
    if isinstance(metadata, dict) and metadata.get('role') == 'counselor':
        return user_id, None

    try:
        role_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_profiles',
            headers=get_service_headers(),
            params={
                'id': f'eq.{user_id}',
                'select': 'role',
                'limit': '1',
            },
            timeout=15,
        )
        if not role_response.ok:
            return None, (jsonify({'error': f'Failed to verify role: {supabase_error_message(role_response)}'}), 500)

        rows = role_response.json() if role_response.content else []
        if not rows or rows[0].get('role') != 'counselor':
            return None, (jsonify({'error': 'Access denied. Counselor role required.'}), 403)
    except requests.RequestException as exc:
        return None, (jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500)

    return user_id, None


def fetch_assigned_student_ids(counselor_id: str) -> tuple[list[str] | None, tuple[Any, int] | None]:
    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/counselor_students',
            headers=get_service_headers(),
            params={
                'counselor_id': f'eq.{counselor_id}',
                'select': 'student_id',
            },
            timeout=15,
        )
        if not response.ok:
            return None, (jsonify({'error': f'Failed to load counselor assignments: {supabase_error_message(response)}'}), 500)

        rows = response.json() if response.content else []
        student_ids = [str(row.get('student_id')) for row in rows if row.get('student_id')]
        return student_ids, None
    except requests.RequestException as exc:
        return None, (jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500)


@counselor_routes.route('/students', methods=['GET'])
def get_students():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        return role_response

    student_ids, assignment_error = fetch_assigned_student_ids(counselor_id)
    if assignment_error:
        return assignment_error
    if not student_ids:
        return jsonify({'students': []}), 200

    try:
        profiles_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_profiles',
            headers=get_service_headers(),
            params={
                'id': f'in.({",".join(student_ids)})',
                'select': 'id,full_name,graduation_year,gpa,sat_score,act_score',
            },
            timeout=15,
        )
        if not profiles_response.ok:
            return jsonify({'error': f'Failed to load student profiles: {supabase_error_message(profiles_response)}'}), 500

        profiles = profiles_response.json() if profiles_response.content else []
        by_id = {str(row.get('id')): row for row in profiles}

        students: list[dict[str, Any]] = []
        for sid in student_ids:
            profile = by_id.get(sid, {})

            tasks_response = requests.get(
                f'{SUPABASE_URL}/rest/v1/tasks',
                headers=get_service_headers(),
                params={
                    'user_id': f'eq.{sid}',
                    'select': 'id,category,status,completed',
                },
                timeout=15,
            )
            tasks = tasks_response.json() if tasks_response.ok and tasks_response.content else []

            colleges_response = requests.get(
                f'{SUPABASE_URL}/rest/v1/user_colleges',
                headers=get_service_headers(),
                params={
                    'user_id': f'eq.{sid}',
                    'select': 'id',
                },
                timeout=15,
            )
            colleges = colleges_response.json() if colleges_response.ok and colleges_response.content else []

            essay_tasks = [task for task in tasks if task.get('category') == 'Essay']
            essays_completed = len(
                [
                    task for task in essay_tasks
                    if task.get('completed') or task.get('status') == 'completed'
                ]
            )
            total_essays = len(essay_tasks)

            has_started = bool(tasks)
            all_completed = bool(tasks) and all(
                task.get('completed') or task.get('status') == 'completed'
                for task in tasks
            )
            if not has_started:
                app_status = 'Not Started'
            elif all_completed:
                app_status = 'Submitted'
            else:
                app_status = 'In Progress'

            grade = 'Junior'
            grad_year = profile.get('graduation_year')
            if isinstance(grad_year, int):
                now = datetime.now(timezone.utc)
                academic_year = now.year + (1 if now.month >= 8 else 0)
                if grad_year - academic_year <= 0:
                    grade = 'Senior'

            students.append(
                {
                    'student_id': sid,
                    'full_name': profile.get('full_name') or 'Unknown',
                    'email': '',
                    'grade': grade,
                    'graduation_year': grad_year,
                    'gpa': profile.get('gpa'),
                    'sat_score': profile.get('sat_score'),
                    'act_score': profile.get('act_score'),
                    'colleges_saved': len(colleges),
                    'essays_completed': essays_completed,
                    'total_essays': total_essays,
                    'application_status': app_status,
                    'last_active': 'Unknown',
                }
            )

        return jsonify({'students': students}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@counselor_routes.route('/tasks', methods=['GET'])
def get_all_tasks():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        return role_response

    student_ids, assignment_error = fetch_assigned_student_ids(counselor_id)
    if assignment_error:
        return assignment_error
    if not student_ids:
        return jsonify({'tasks': []}), 200

    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/tasks',
            headers=get_service_headers(),
            params={
                'user_id': f'in.({",".join(student_ids)})',
                'select': 'id,user_id,title,description,due_date,deadline,status,completed,priority,category,created_at,updated_at',
                'order': 'due_date.asc.nullslast,created_at.asc.nullslast',
            },
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to load tasks: {supabase_error_message(response)}'}), 500

        tasks = response.json() if response.content else []
        return jsonify({'tasks': tasks}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@counselor_routes.route('/checklists', methods=['GET'])
def get_checklists():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        return role_response

    try:
        checklist_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/counselor_checklists',
            headers=get_service_headers(),
            params={
                'counselor_id': f'eq.{counselor_id}',
                'select': '*',
                'order': 'id.asc',
            },
            timeout=15,
        )
        if not checklist_response.ok:
            return jsonify({'error': f'Failed to load checklists: {supabase_error_message(checklist_response)}'}), 500

        assignment_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/counselor_students',
            headers=get_service_headers(),
            params={
                'counselor_id': f'eq.{counselor_id}',
                'select': 'id',
            },
            timeout=15,
        )
        assigned_count = 0
        if assignment_response.ok and assignment_response.content:
            assigned_count = len(assignment_response.json())

        checklists = checklist_response.json() if checklist_response.content else []
        for checklist in checklists:
            checklist['assignedStudents'] = assigned_count

        return jsonify({'checklists': checklists}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@counselor_routes.route('/documents', methods=['GET'])
def get_documents():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        return role_response

    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/counselor_documents',
            headers=get_service_headers(),
            params={
                'counselor_id': f'eq.{counselor_id}',
                'select': '*',
                'order': 'uploaded_at.desc.nullslast,id.desc',
            },
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to load documents: {supabase_error_message(response)}'}), 500

        documents = response.json() if response.content else []
        for document in documents:
            uploaded_at = document.get('uploaded_at')
            if isinstance(uploaded_at, str) and uploaded_at:
                document['uploadedAt'] = uploaded_at[:10]
            file_type = document.get('file_type')
            if file_type:
                document['fileType'] = file_type

        return jsonify({'documents': documents}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@counselor_routes.route('/invite', methods=['POST'])
def generate_invite_code():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        return role_response

    code = secrets.token_hex(4).upper()
    try:
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/counselor_invites',
            headers={**get_service_headers(), 'Prefer': 'return=representation'},
            json={
                'counselor_id': counselor_id,
                'code': code,
                'used': False,
            },
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to generate invite code: {supabase_error_message(response)}'}), 500
        return jsonify({'message': 'Invite code generated', 'code': code}), 201
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@counselor_routes.route('/invite/codes', methods=['GET'])
def get_invite_codes():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        return role_response

    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/counselor_invites',
            headers=get_service_headers(),
            params={
                'counselor_id': f'eq.{counselor_id}',
                'select': '*',
                'order': 'id.desc',
            },
            timeout=15,
        )
        if not response.ok:
            return jsonify({'error': f'Failed to load invite codes: {supabase_error_message(response)}'}), 500

        return jsonify({'codes': response.json() if response.content else []}), 200
    except requests.RequestException as exc:
        return jsonify({'error': f'Unable to reach Supabase: {exc}'}), 500


@counselor_routes.route('/role-check', methods=['GET'])
def role_check():
    config_error = ensure_supabase_config()
    if config_error:
        return jsonify({'authorized': False, 'error': config_error}), 500

    counselor_id, role_response = get_counselor_user_id()
    if role_response:
        body, status = role_response
        if status in (401, 403):
            return jsonify({'authorized': False}), status
        return body, status

    return jsonify({'authorized': True, 'role': 'counselor', 'user_id': counselor_id}), 200
