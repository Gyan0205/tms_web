from flask import Blueprint, request, jsonify
from database import db, Tablet, Schedule, ScheduleLog, DAYS, SLOTS
from datetime import date
from sqlalchemy.exc import IntegrityError

prescription_bp = Blueprint("prescription", __name__)


# ── Get full weekly schedule ───────────────────────────────────────────────────
@prescription_bp.route("/api/prescription", methods=["GET"])
def get_schedule():
    entries = Schedule.query.order_by(Schedule.day_of_week, Schedule.time_slot).all()
    return jsonify([e.to_dict() for e in entries])


# ── Add a schedule entry ───────────────────────────────────────────────────────
@prescription_bp.route("/api/prescription", methods=["POST"])
def add_schedule():
    data = request.get_json()
    tablet_id = data.get("tablet_id")
    day = data.get("day_of_week", "").lower()
    slot = data.get("time_slot", "").lower()

    if not tablet_id or day not in DAYS or slot not in SLOTS:
        return jsonify({"error": "Invalid tablet, day, or time slot"}), 400

    tablet = Tablet.query.get(tablet_id)
    if not tablet:
        return jsonify({"error": "Tablet not found"}), 404

    entry = Schedule(tablet_id=tablet_id, day_of_week=day, time_slot=slot)
    db.session.add(entry)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "This tablet is already scheduled for that day and slot"}), 409

    return jsonify(entry.to_dict()), 201


# ── Remove a schedule entry ────────────────────────────────────────────────────
@prescription_bp.route("/api/prescription/<int:entry_id>", methods=["DELETE"])
def delete_schedule(entry_id):
    entry = Schedule.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Schedule entry removed"})


# ── Get today's schedule with taken status ─────────────────────────────────────
@prescription_bp.route("/api/prescription/today", methods=["GET"])
def today_schedule():
    today_str = date.today().isoformat()
    today_day = date.today().strftime("%A").lower()  # e.g. "monday"

    entries = Schedule.query.filter_by(day_of_week=today_day).all()

    # Build taken lookup
    log_map = {}
    for entry in entries:
        log = ScheduleLog.query.filter_by(
            schedule_id=entry.id, log_date=today_str
        ).first()
        log_map[entry.id] = log.taken if log else False

    result = []
    for entry in entries:
        d = entry.to_dict()
        d["taken"] = log_map.get(entry.id, False)
        result.append(d)

    return jsonify(result)


# ── Toggle taken status for a schedule entry on a specific date ────────────────
@prescription_bp.route("/api/prescription/<int:entry_id>/log", methods=["POST"])
def toggle_log(entry_id):
    entry = Schedule.query.get_or_404(entry_id)
    data = request.get_json()
    log_date = data.get("date", date.today().isoformat())
    taken = bool(data.get("taken", True))

    log = ScheduleLog.query.filter_by(
        schedule_id=entry_id, log_date=log_date
    ).first()

    if log:
        log.taken = taken
    else:
        log = ScheduleLog(schedule_id=entry_id, log_date=log_date, taken=taken)
        db.session.add(log)

    # If marking as taken, also decrement tablet quantity
    if taken and entry.tablet and entry.tablet.quantity > 0:
        entry.tablet.quantity -= 1

    db.session.commit()
    return jsonify({"schedule_id": entry_id, "log_date": log_date, "taken": taken})


# ── Get logs for a date range (used to build the full week view) ──────────────
@prescription_bp.route("/api/prescription/week", methods=["GET"])
def week_schedule():
    """Return all schedule entries + taken status for each day of the current week."""
    today = date.today()
    # Monday of current week
    monday = today - __import__("datetime").timedelta(days=today.weekday())

    week_dates = {
        DAYS[i]: (monday + __import__("datetime").timedelta(days=i)).isoformat()
        for i in range(7)
    }

    all_entries = Schedule.query.all()

    # Build log map: {schedule_id: {date_str: taken}}
    all_logs = ScheduleLog.query.filter(
        ScheduleLog.log_date.in_(week_dates.values())
    ).all()

    log_map = {}
    for log in all_logs:
        log_map.setdefault(log.schedule_id, {})[log.log_date] = log.taken

    result = {day: {"date": week_dates[day], "slots": {slot: [] for slot in SLOTS}} for day in DAYS}

    for entry in all_entries:
        day = entry.day_of_week
        slot = entry.time_slot
        date_str = week_dates.get(day, "")
        taken = log_map.get(entry.id, {}).get(date_str, False)
        d = entry.to_dict()
        d["taken"] = taken
        d["date"] = date_str
        result[day]["slots"][slot].append(d)

    return jsonify(result)
