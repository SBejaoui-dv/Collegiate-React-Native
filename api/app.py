from flask import Flask
from flask_cors import CORS

from interfaces.college_routes import college_routes
from interfaces.database_routes import database_routes
from interfaces.openai_routes import openai_routes
from interfaces.scholarship_routes import scholarship_routes
from interfaces.stripe_routes import stripe_routes
from interfaces.task_routes import task_routes
from interfaces.token_routes import token_routes


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.register_blueprint(college_routes)
    app.register_blueprint(database_routes)
    app.register_blueprint(openai_routes)
    app.register_blueprint(scholarship_routes)
    app.register_blueprint(stripe_routes)
    app.register_blueprint(task_routes)
    app.register_blueprint(token_routes)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
