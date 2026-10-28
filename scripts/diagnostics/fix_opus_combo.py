import sqlite3, os, json
db_path = os.path.expandvars(r"%APPDATA%\9router\db\data.sqlite")
conn = sqlite3.connect(db_path)
c = conn.cursor()

active_models = [
    "lr/deepseek-v4.1-flash",
    "ab/free/deepseek-v4.1-flash",
    "th/deepseek-v4.1-flash:free",
    "zx/deepseek/deepseek-v4.1-flash",
    "lr/glm-5.3-flash",
    "zx/minimax/minimax-m3.1-flash"
]

c.execute("UPDATE combos SET models = ? WHERE name = 'opus-4.6'", (json.dumps(active_models),))
conn.commit()
print("Updated opus-4.6 combo to:", active_models)

# Verify
c.execute("SELECT name, models FROM combos WHERE name = 'opus-4.6'")
print("Verified in DB:", c.fetchone())
