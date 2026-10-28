import sqlite3, json
con = sqlite3.connect('C:/Users/Akshan sharma/AppData/Roaming/9router/db/data.sqlite')
cur = con.cursor()
rows = cur.execute("SELECT id, type, name, data FROM providerNodes").fetchall()
for r in rows:
    data = json.loads(r[3]) if r[3] else {}
    prefix = data.get('prefix', '')
    print(f"Node: {r[1]} : {r[2]} prefix={prefix}")
