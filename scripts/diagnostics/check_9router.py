import sqlite3
import json

conn = sqlite3.connect(r'C:\Users\Akshan sharma\AppData\Roaming\9router\db\data.sqlite')
cur = conn.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)

for t in tables:
    if 'provider' in t.lower() or 'key' in t.lower() or 'account' in t.lower() or 'credential' in t.lower() or 'config' in t.lower() or 'combo' in t.lower():
        print(f"\n--- Table: {t} ---")
        try:
            rows = cur.execute(f"SELECT * FROM [{t}] LIMIT 10").fetchall()
            cols = [d[0] for d in cur.description]
            print("Cols:", cols)
            for r in rows:
                print(r[:4])
        except Exception as e:
            print("Error reading", t, e)
