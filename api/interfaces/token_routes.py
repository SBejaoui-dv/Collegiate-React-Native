from flask import Blueprint, jsonify

from interfaces.database_routes import get_token_from_header, get_user_from_token
from utils.token_manager import get_token_status

token_routes = Blueprint('token_routes', __name__, url_prefix='/api/tokens')


@token_routes.route('/status', methods=['GET'])
def token_status():
    token = get_token_from_header()
    if not token:
        return jsonify({'error': 'Authentication required'}), 401

    user, auth_error = get_user_from_token(token)
    if not user:
        return jsonify({'error': auth_error or 'Invalid auth token'}), 401

    user_id = user.get('id')
    if not user_id:
        return jsonify({'error': 'Supabase auth payload missing user id.'}), 401

    return jsonify(get_token_status(str(user_id))), 200
