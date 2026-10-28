import sqlite3, os
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()
for t in ['combos', 'settings']:
    print(f"\n=== {t} ===")
    for r in c.execute(f"SELECT * FROM {t}").fetchall():
        print(r)
print("\n=== Recent requestDetails (Last 5) ===")
for r in c.execute("SELECT id, model, status, createdAt, duration, error FROM requestDetails ORDER BY id DESC LIMIT 5").fetchall():
    print(r)
