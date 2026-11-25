from flask import Blueprint, request, jsonify
from database import db, Tablet
from datetime import date

tablets_bp = Blueprint("tablets", __name__)


# ── List all tablets ──────────────────────────────────────────────────────────
@tablets_bp.route("/api/tablets", methods=["GET"])
def list_tablets():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()

    query = Tablet.query

    if search:
        query = query.filter(
            db.or_(
                Tablet.name.ilike(f"%{search}%"),
                Tablet.generic_name.ilike(f"%{search}%"),
            )
        )
    if category:
        query = query.filter(Tablet.category.ilike(f"%{category}%"))

    tablets = query.order_by(Tablet.name).all()
    return jsonify([t.to_dict() for t in tablets])


# ── Add a tablet ──────────────────────────────────────────────────────────────
@tablets_bp.route("/api/tablets", methods=["POST"])
def add_tablet():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Tablet name is required"}), 400

    tablet = Tablet(
        name=data["name"].strip(),
        generic_name=data.get("generic_name", "").strip() or None,
        category=data.get("category", "").strip() or None,
        quantity=int(data.get("quantity", 0)),
        expiry_date=data.get("expiry_date") or None,
        notes=data.get("notes", "").strip() or None,
    )
    db.session.add(tablet)
    db.session.commit()
    return jsonify(tablet.to_dict()), 201


# ── Get single tablet ─────────────────────────────────────────────────────────
@tablets_bp.route("/api/tablets/<int:tablet_id>", methods=["GET"])
def get_tablet(tablet_id):
    tablet = Tablet.query.get_or_404(tablet_id)
    return jsonify(tablet.to_dict())


# ── Update a tablet ───────────────────────────────────────────────────────────
@tablets_bp.route("/api/tablets/<int:tablet_id>", methods=["PUT"])
def update_tablet(tablet_id):
    tablet = Tablet.query.get_or_404(tablet_id)
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "name" in data:
        tablet.name = data["name"].strip()
    if "generic_name" in data:
        tablet.generic_name = data["generic_name"].strip() or None
    if "category" in data:
        tablet.category = data["category"].strip() or None
    if "quantity" in data:
        tablet.quantity = int(data["quantity"])
    if "expiry_date" in data:
        tablet.expiry_date = data["expiry_date"] or None
    if "notes" in data:
        tablet.notes = data["notes"].strip() or None

    db.session.commit()
    return jsonify(tablet.to_dict())


# ── Delete a tablet ───────────────────────────────────────────────────────────
@tablets_bp.route("/api/tablets/<int:tablet_id>", methods=["DELETE"])
def delete_tablet(tablet_id):
    tablet = Tablet.query.get_or_404(tablet_id)
    db.session.delete(tablet)
    db.session.commit()
    return jsonify({"message": "Tablet deleted successfully"})


# ── Consume a tablet ──────────────────────────────────────────────────────────
@tablets_bp.route("/api/tablets/<int:tablet_id>/consume", methods=["POST"])
def consume_tablet(tablet_id):
    tablet = Tablet.query.get_or_404(tablet_id)
    if tablet.quantity > 0:
        tablet.quantity -= 1
        db.session.commit()
        return jsonify(tablet.to_dict())
    return jsonify({"error": "Quantity is already zero"}), 400


# ── Dashboard stats ───────────────────────────────────────────────────────────
@tablets_bp.route("/api/stats", methods=["GET"])
def stats():
    today = date.today()
    all_tablets = Tablet.query.all()

    total = len(all_tablets)
    out_of_stock = sum(1 for t in all_tablets if t.quantity == 0)
    low_stock = sum(1 for t in all_tablets if 0 < t.quantity <= 10)
    expiring_soon = 0
    expired = 0

    for t in all_tablets:
        if t.expiry_date:
            try:
                exp = date.fromisoformat(t.expiry_date)
                days = (exp - today).days
                if days < 0:
                    expired += 1
                elif days <= 30:
                    expiring_soon += 1
            except ValueError:
                pass

    return jsonify({
        "total": total,
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
        "expiring_soon": expiring_soon,
        "expired": expired,
    })


# ── Get categories list ───────────────────────────────────────────────────────
@tablets_bp.route("/api/categories", methods=["GET"])
def categories():
    rows = db.session.query(Tablet.category).filter(Tablet.category != None).distinct().all()
    cats = sorted([r[0] for r in rows if r[0]])
    return jsonify(cats)
