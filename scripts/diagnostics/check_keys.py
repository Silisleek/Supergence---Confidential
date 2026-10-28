import sqlite3, os
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()
for r in c.execute("SELECT * FROM apiKeys").fetchall():
    print(r)
