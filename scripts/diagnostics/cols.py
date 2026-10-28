import sqlite3, os
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()
cols = [r[1] for r in c.execute("PRAGMA table_info(providerConnections)").fetchall()]
print("providerConnections cols:", cols)
