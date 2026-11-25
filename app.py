import os
from flask import Flask, render_template
from database import db
from routes.tablets import tablets_bp
from routes.prescription import prescription_bp

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'tms.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# Set SECRET_KEY in the environment for a fixed key; otherwise a random one is used per run.
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or os.urandom(32).hex()

# ── Init DB ───────────────────────────────────────────────────────────────────
db.init_app(app)

# ── Register Blueprints ───────────────────────────────────────────────────────
app.register_blueprint(tablets_bp)
app.register_blueprint(prescription_bp)


# ── Page Routes ───────────────────────────────────────────────────────────────
@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/tablets")
def tablets_page():
    return render_template("tablets.html")


@app.route("/prescription")
def prescription_page():
    return render_template("prescription.html")


# ── Bootstrap DB on first run ─────────────────────────────────────────────────
with app.app_context():
    db.create_all()


if __name__ == "__main__":
    print("TMS running at http://localhost:5000")
    app.run(debug=True, port=5000)
