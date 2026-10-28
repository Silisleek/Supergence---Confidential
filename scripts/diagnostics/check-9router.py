import sqlite3
import os
import json

db_path = os.path.expandvars(r'%APPDATA%\9router\db\data.sqlite')
conn = sqlite3.connect(db_path)
c = conn.cursor()

for t in ['providerConnections', 'providerNodes']:
    print(f"\n=== Table {t} ===")
    c.execute(f"SELECT * FROM {t}")
    for r in c.fetchall():
        print(r)
