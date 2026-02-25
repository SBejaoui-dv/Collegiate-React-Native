from flask import Flask
from flask_cors import CORS

from interfaces.college_routes import college_routes
from interfaces.database_routes import database_routes
from interfaces.openai_routes import openai_routes


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.register_blueprint(college_routes)
    app.register_blueprint(database_routes)
    app.register_blueprint(openai_routes)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
