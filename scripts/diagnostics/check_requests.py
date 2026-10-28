import sqlite3, os
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()
cols = [r[1] for r in c.execute("PRAGMA table_info(requestDetails)").fetchall()]
print("Columns:", cols)
col_str = ", ".join(cols[:8])
for r in c.execute(f"SELECT {col_str} FROM requestDetails ORDER BY rowid DESC LIMIT 5").fetchall():
    print(r)
