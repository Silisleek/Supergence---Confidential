import sqlite3, os
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)
for t in tables:
    if "model" in t.lower() or "route" in t.lower() or "config" in t.lower():
        print(f"\n=== {t} ===")
        for r in c.execute(f"SELECT * FROM {t} LIMIT 10").fetchall():
            print(r)
