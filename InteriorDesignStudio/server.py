import json
import math
import mimetypes
import re
import sqlite3
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "interior_design.sqlite3"
ROOMS = {"Living Room", "Bedroom", "Kitchen", "Dining Room", "Workspace", "Bathroom"}
STYLES = {
    "Warm Minimal",
    "Quiet Luxury",
    "Modern Natural",
    "Earthy Organic",
    "Scandinavian",
    "Spa Inspired",
}
PALETTES = {"#e7ddce", "#a7b39b", "#b9785d", "#777d80", "#d2bd9e"}
DESIGNS = {
    "Warm Minimal Living",
    "Quiet Luxury Bedroom",
    "Sage Modern Kitchen",
    "Earthy Dining Space",
    "Creative Work Nook",
    "Spa Inspired Bath",
}
PROJECTS = {
    "Living room makeover",
    "Bedroom redesign",
    "Kitchen update",
    "Full home design",
    "Workspace",
    "Other",
}
MAX_BODY_SIZE = 16_384
STATIC_EXTENSIONS = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico"}


def connect_database():
    connection = sqlite3.connect(DATABASE, timeout=5)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with connect_database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS browser_state (
                client_id TEXT PRIMARY KEY,
                favorites TEXT NOT NULL DEFAULT '[]',
                plan TEXT,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS enquiries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                project TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )


class RequestError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


class StudioHandler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise RequestError(400, "Invalid content length.") from error
        if length < 1 or length > MAX_BODY_SIZE:
            raise RequestError(413, "Request body is empty or too large.")
        try:
            return json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise RequestError(400, "Request body must be valid JSON.") from error

    def client_id(self):
        value = self.headers.get("X-Client-Id", "")
        try:
            return str(uuid.UUID(value))
        except (ValueError, AttributeError) as error:
            raise RequestError(400, "A valid X-Client-Id header is required.") from error

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/state":
            try:
                client_id = self.client_id()
                with connect_database() as connection:
                    row = connection.execute(
                        "SELECT favorites, plan FROM browser_state WHERE client_id = ?",
                        (client_id,),
                    ).fetchone()
                self.send_json(
                    200,
                    {
                        "favorites": json.loads(row["favorites"]) if row else [],
                        "plan": json.loads(row["plan"]) if row and row["plan"] else None,
                        "initialized": row is not None,
                    },
                )
            except RequestError as error:
                self.send_json(error.status, {"error": error.message})
            except sqlite3.Error:
                self.send_json(500, {"error": "Could not read saved data from SQLite."})
            return
        self.serve_static(path)

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/state":
            self.send_json(404, {"error": "Endpoint not found."})
            return
        try:
            client_id = self.client_id()
            payload = self.read_json()
            favorites = payload.get("favorites")
            plan = payload.get("plan")
            if (
                not isinstance(favorites, list)
                or len(favorites) > len(DESIGNS)
                or any(not isinstance(item, str) or item not in DESIGNS for item in favorites)
                or len(set(favorites)) != len(favorites)
            ):
                raise RequestError(400, "Favorites must be a list of known room designs.")
            if plan is not None:
                if (
                    not isinstance(plan, dict)
                    or plan.get("room") not in ROOMS
                    or plan.get("style") not in STYLES
                ):
                    raise RequestError(400, "Plan must include a valid room and design style.")
                palette = plan.get("palette")
                if palette is not None and palette not in PALETTES:
                    raise RequestError(400, "Plan palette must be one of the available colours.")
                budget = plan.get("budget")
                if budget is not None:
                    required_fields = {"area", "rate", "finish", "extra", "total"}
                    if not isinstance(budget, dict) or not required_fields.issubset(budget):
                        raise RequestError(400, "Plan budget must include its area, rate, finish, extras and total.")
                    values = {key: budget[key] for key in required_fields}
                    if any(
                        isinstance(value, bool)
                        or not isinstance(value, (int, float))
                        or not math.isfinite(value)
                        for value in values.values()
                    ):
                        raise RequestError(400, "Plan budget values must be finite numbers.")
                    expected_total = (
                        values["area"] * values["rate"] * values["finish"] + values["extra"]
                    )
                    if (
                        values["area"] < 1
                        or values["rate"] < 0
                        or values["extra"] < 0
                        or values["total"] < 0
                        or values["finish"] not in {0.85, 1, 1.35, 1.7}
                        or not math.isfinite(expected_total)
                        or values["total"] != math.floor(expected_total + 0.5)
                    ):
                        raise RequestError(400, "Plan budget values are outside the allowed range.")
            with connect_database() as connection:
                connection.execute(
                    """
                    INSERT INTO browser_state (client_id, favorites, plan, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(client_id) DO UPDATE SET
                        favorites = excluded.favorites,
                        plan = excluded.plan,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (
                        client_id,
                        json.dumps(favorites),
                        json.dumps(plan) if plan is not None else None,
                    ),
                )
            self.send_json(200, {"ok": True})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
        except (AttributeError, TypeError):
            self.send_json(400, {"error": "Request body must be a JSON object."})
        except sqlite3.Error:
            self.send_json(500, {"error": "Could not save data to SQLite."})

    def do_POST(self):
        if urlsplit(self.path).path != "/api/enquiries":
            self.send_json(404, {"error": "Endpoint not found."})
            return
        try:
            payload = self.read_json()
            if not isinstance(payload, dict):
                raise RequestError(400, "Request body must be a JSON object.")
            name = self.valid_text(payload, "name", 100)
            email = self.valid_text(payload, "email", 254)
            project = self.valid_text(payload, "project", 100)
            message = self.valid_text(payload, "message", 4000)
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                raise RequestError(400, "Enter a valid email address.")
            if project not in PROJECTS:
                raise RequestError(400, "Select a valid project type.")
            with connect_database() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO enquiries (name, email, project, message)
                    VALUES (?, ?, ?, ?)
                    """,
                    (name, email, project, message),
                )
            self.send_json(201, {"ok": True, "id": cursor.lastrowid})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
        except sqlite3.Error:
            self.send_json(500, {"error": "Could not save enquiry to SQLite."})

    @staticmethod
    def valid_text(payload, key, max_length):
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > max_length:
            raise RequestError(400, f"{key.capitalize()} is required and must be at most {max_length} characters.")
        return value.strip()

    def serve_static(self, url_path):
        relative_path = unquote(url_path).lstrip("/")
        requested = (ROOT / relative_path).resolve()
        try:
            requested.relative_to(ROOT)
        except ValueError:
            self.send_error(404)
            return
        if requested.is_dir():
            requested = requested / "index.html"
        if not requested.is_file() or requested.suffix.lower() not in STATIC_EXTENSIONS:
            self.send_error(404)
            return
        content = requested.read_bytes()
        content_type = mimetypes.guess_type(str(requested))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8" if content_type.startswith("text/") else content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    initialize_database()
    server = ThreadingHTTPServer(("127.0.0.1", 8000), StudioHandler)
    print("Room & Reverie is running at http://127.0.0.1:8000")
    print(f"SQLite database: {DATABASE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
