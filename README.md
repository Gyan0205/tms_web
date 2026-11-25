# 💊 TMS — Home Tablets Manager

A simple personal home tablet/medicine tracker built with **Flask + SQLite**.

## Features
- Track all tablets at home (name, generic name, category, quantity, expiry)
- Dashboard with stat cards: total, out of stock, low stock, expiring soon, expired
- Live alerts for low stock and expiring tablets
- Add / Edit / Delete tablets via a clean modal UI
- Filter & search by name, category, stock level, expiry status
- Dark-mode glassmorphism UI

## Tech Stack
| Layer    | Tech                   |
|----------|------------------------|
| Backend  | Python · Flask         |
| Database | SQLite · SQLAlchemy    |
| Frontend | HTML · CSS · JS (Vanilla) |

## Setup & Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open in browser
http://localhost:5000
```

The SQLite database (`tms.db`) is created automatically on first run.

## Project Structure
```
TMS/
├── app.py              ← Flask entry point
├── database.py         ← SQLite model (Tablet)
├── routes/
│   └── tablets.py      ← REST API endpoints
├── static/
│   ├── css/style.css   ← Dark-mode styles
│   └── js/
│       ├── api.js      ← Fetch helpers & utilities
│       ├── dashboard.js← Dashboard logic
│       └── tablets.js  ← Tablets CRUD logic
├── templates/
│   ├── base.html       ← Sidebar layout shell
│   ├── index.html      ← Dashboard page
│   └── tablets.html    ← Tablets management page
├── requirements.txt
└── tms.db              ← Auto-created SQLite database
```
