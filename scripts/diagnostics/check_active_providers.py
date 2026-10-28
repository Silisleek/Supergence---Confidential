import sqlite3, os, json
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()
for r in c.execute("SELECT id, provider, isActive, data FROM providerConnections").fetchall():
    try:
        data = json.loads(r[3])
        node = data.get("providerSpecificData", {}).get("nodeName", r[1])
        status = data.get("testStatus", "unknown")
        err = data.get("lastError", "none")
        print(f"Provider: {node:22} | Active: {r[2]} | Status: {status:12} | Err: {str(err)[:50]}")
    except Exception as e:
        print(r[0], e)
