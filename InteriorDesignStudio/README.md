# Room & Reverie — Interior Design Website

A 9-page, responsive interior design web application built with HTML, CSS, vanilla JavaScript, Python and SQLite.

## Run with the SQLite backend
1. Install Python 3.9 or later.
2. Open a terminal in the `InteriorDesignStudio` folder.
3. Run `python server.py`.
4. Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

The server creates `interior_design.sqlite3` automatically. Stop it with Ctrl+C. The database file is local and excluded from version control.

The backend stores contact enquiries in SQLite, and stores each browser's favourites and saved room plan separately. Existing browser-saved favourites and plans are imported the first time that browser connects. If the server is unavailable, the site reports this and keeps those features in browser storage instead.

## Use without an internet connection
The app has no external runtime dependencies or remote assets. Start it with `python server.py` while offline and open `http://127.0.0.1:8000`; the local server, images, styles and scripts all work without internet access.

You can also open `index.html` directly in a browser. In this mode, favourites, room plans and enquiries are saved only in that browser, not in SQLite.

This is a local/demo backend, not a production deployment: there is no user authentication, and browser state is associated with a locally generated browser ID. Add authentication and access controls before hosting it publicly.

## Pages
1. Home — overview and featured rooms
2. Rooms & Styles — searchable room concepts and six design aesthetics
3. Gallery — searchable visual collection
4. Planner — interactive room/style preview and saved SQLite plan
5. Budget — dynamic renovation estimate calculator (₹)
6. Ideas — rotating design tips and checklist
7. About — studio overview
8. Contact — enquiry form saved in SQLite (with a browser-storage fallback)
9. Saved — favourite room concepts

## Included images
Six original SVG room illustrations are stored in `assets/` and work offline:
living room, bedroom, kitchen, dining room, workspace and bathroom.

## Dynamic features
- Responsive navigation menu
- Light/dark theme toggle (saved in localStorage)
- Search and room-type filtering
- Save/remove favourite designs
- Interactive room planner with selectable colour palettes and a budget review step
- Save the complete room, style, palette and budget estimate locally
- Live budget calculator
- Rotating/random design tips
- Contact form validation and SQLite enquiry storage (browser storage fallback)
- Toast notifications

## Notes
The site uses only local assets and system font fallbacks. All six room illustrations are local files, so they display without internet. The Python backend uses only the standard library and SQLite; no package installation or external service is required.
