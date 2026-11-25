from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
import calendar

db = SQLAlchemy()


class Tablet(db.Model):
    __tablename__ = "tablets"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    generic_name = db.Column(db.String(150), nullable=True)
    category = db.Column(db.String(100), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    expiry_date = db.Column(db.String(10), nullable=True)   # YYYY-MM
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        today = date.today()
        expiry = None
        days_left = None
        expiry_status = "none"

        if self.expiry_date:
            try:
                expiry = self.expiry_date  # stored as YYYY-MM
                year, month = map(int, self.expiry_date.split("-"))
                # Use the last day of the expiry month
                last_day = calendar.monthrange(year, month)[1]
                exp_date = date(year, month, last_day)
                days_left = (exp_date - today).days
                if days_left < 0:
                    expiry_status = "expired"
                elif days_left <= 60:
                    expiry_status = "expiring_soon"
                else:
                    expiry_status = "good"
            except (ValueError, AttributeError):
                pass

        stock_status = "good"
        if self.quantity == 0:
            stock_status = "out"
        elif self.quantity <= 5:
            stock_status = "critical"
        elif self.quantity <= 10:
            stock_status = "low"

        return {
            "id": self.id,
            "name": self.name,
            "generic_name": self.generic_name,
            "category": self.category,
            "quantity": self.quantity,
            "expiry_date": expiry,
            "days_left": days_left,
            "expiry_status": expiry_status,
            "stock_status": stock_status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Prescription / Schedule models
# ─────────────────────────────────────────────────────────────────────────────

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
SLOTS = ["morning", "afternoon", "evening"]


class Schedule(db.Model):
    """Defines WHICH tablet to take on WHICH day at WHICH time."""
    __tablename__ = "schedule"

    id = db.Column(db.Integer, primary_key=True)
    tablet_id = db.Column(db.Integer, db.ForeignKey("tablets.id", ondelete="CASCADE"), nullable=False)
    day_of_week = db.Column(db.String(10), nullable=False)   # monday … sunday
    time_slot = db.Column(db.String(20), nullable=False)     # morning / afternoon / evening
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tablet = db.relationship("Tablet", backref=db.backref("schedules", cascade="all, delete-orphan"))

    __table_args__ = (
        db.UniqueConstraint("tablet_id", "day_of_week", "time_slot", name="uq_schedule"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "tablet_id": self.tablet_id,
            "tablet_name": self.tablet.name if self.tablet else None,
            "tablet_generic": self.tablet.generic_name if self.tablet else None,
            "day_of_week": self.day_of_week,
            "time_slot": self.time_slot,
        }


class ScheduleLog(db.Model):
    """Records whether a scheduled slot was actually taken on a given date."""
    __tablename__ = "schedule_log"

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey("schedule.id", ondelete="CASCADE"), nullable=False)
    log_date = db.Column(db.String(10), nullable=False)   # YYYY-MM-DD
    taken = db.Column(db.Boolean, default=False, nullable=False)

    schedule = db.relationship("Schedule", backref=db.backref("logs", cascade="all, delete-orphan"))

    __table_args__ = (
        db.UniqueConstraint("schedule_id", "log_date", name="uq_schedule_log"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "schedule_id": self.schedule_id,
            "log_date": self.log_date,
            "taken": self.taken,
        }
