import sys
import os
import traceback

# In Blender, sys.argv after '--' are custom arguments
args = sys.argv
custom_args = []
if "--" in args:
    custom_args = args[args.index("--") + 1:]

if len(custom_args) < 2:
    print("Usage: runner.py -- <script.py> <log.txt>")
    sys.exit(1)

script_path = custom_args[0]
log_path = custom_args[1]

with open(log_path, "w", encoding="utf-8", buffering=1) as log_f:
    sys.stdout = log_f
    sys.stderr = log_f
    try:
        with open(script_path, "r", encoding="utf-8") as sf:
            code = sf.read()
        compiled = compile(code, script_path, "exec")
        exec(compiled, {"__name__": "__main__"})
    except Exception as e:
        traceback.print_exc(file=log_f)
        sys.exit(1)
