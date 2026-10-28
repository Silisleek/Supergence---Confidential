"""
Hand Gesture Mouse Controller v7  -  customizable, keeps working in the background
==================================================================================
Control your whole PC with your hand through a webcam. EVERY gesture can be
remapped to a different action by editing 'gestures.json' (created next to this
script on first run). The file reloads LIVE while the program is running.

Install:  pip install mediapipe opencv-python numpy pyautogui
Run:      python hand_mouse_v6.py [--view full|mini|hidden] [--no-control]
                                  [--camera N] [--config FILE]
Other:    python hand_mouse_v6.py --list           show every gesture and its action
          python hand_mouse_v6.py --edit           open gestures.json in your editor
          python hand_mouse_v6.py --reset-config   restore the default gestures.json
          python hand_mouse_v6.py --debug          print FPS + the app in front every 2s (for troubleshooting)
          python hand_mouse_v6.py --admin          restart as Administrator (needed to control elevated apps)

HOW TO CUSTOMIZE (gestures.json)
  "gestures": {
      "ROCK": "mute",                                  <- use a preset name
      "SHAKA": {"do": "open", "target": "notepad.exe"},  <- or a custom action
      "FIST": "none"                                   <- or disable it
  }
  Delete a line to get that gesture's default back. Save the file: it applies
  within a second (no restart). Mistakes are reported and the old setting is kept.

  Action types ("do"):
    move, precision_move, freeze, scroll, hscroll, zoom, window_switcher   (poses only)
    click_drag                                                             (pinches only)
    click (button), double_click, key (key), hotkey (keys), scroll_once (amount),
    type (text), open (target: app / file / URL), run (command)            (anywhere)
    none
  One-shot actions on a pose fire "when": "hold" (default, after a short hold),
  "enter" (immediately) or "repeat" (again and again while held).
  Preset names: see "_available_presets" in the file, or run --list.

Keep your hand upright (fingers pointing up) facing the camera.

WORKS WHILE YOU USE OTHER APPS
  The camera window does NOT need to be in front, visible or even open. Use  --view mini  for a small
  always-on-top preview, or F9 to hide it completely. The program also: survives camera hiccups
  (reconnects automatically), survives errors, ignores the screen-corner crash, and stops Windows from
  slowing it down when it is in the background.  Emergency stop: F10 (works from any app).
  NOTE: Windows blocks input to apps running as Administrator (e.g. Task Manager) unless this
  program is also Administrator - use  --admin  for those.

GLOBAL HOTKEYS (work from ANY app, even with the camera window hidden)
  F8  mouse control ON / OFF (demo mode)     F9  view: FULL -> MINI -> HIDDEN     F10  quit
In-window keys: m = control on/off, v = view, c = edit gestures.json, t = trail,
                r = reset cursor offset, q = quit
Beeps: high = control ON, low = control OFF, double = view change, short = action fired.
"""

import os
import sys
import json
import time
import math
import argparse
import traceback
import threading
import subprocess
import webbrowser
import urllib.request
from collections import deque, Counter
from pathlib import Path

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
import pyautogui

# ---------------- Fixed settings ----------------
CAM_INDEX = 0
CAM_W, CAM_H = 640, 480
DISP_W, DISP_H = 960, 720        # full-view camera size (4:3)
PANEL_W = 480
MINI_W, MINI_H = 360, 270
POSE_VOTE = 4
TRAIL_LEN = 25
CONFIG_CHECK_EVERY = 1.0         # seconds between checks for edits to gestures.json

pyautogui.FAILSAFE = False       # corner-failsafe OFF: flinging the mouse to a corner must not kill the program.
                                 # Emergency stop is F10 (works from any app).
pyautogui.PAUSE = 0
SCREEN_W, SCREEN_H = pyautogui.size()

VK_F8, VK_F9, VK_F10 = 0x77, 0x78, 0x79
WIN_FULL = "Hand Mouse Showcase"
WIN_MINI = "Hand Mouse Mini"

MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
             "hand_landmarker/float16/1/hand_landmarker.task")
MODEL_PATH = Path(__file__).resolve().with_name("hand_landmarker.task")
CONFIG_PATH = Path(__file__).resolve().with_name("gestures.json")

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20),
]
PALM_IDS = (0, 5, 9, 13, 17)

# ---------------- Gesture catalog ----------------
POSES = ["OPEN", "POINT", "FIST", "SCROLL", "ZOOM", "THUMB_UP", "THUMB_DOWN",
         "ROCK", "SHAKA", "ILY", "FOUR"]
PINCH_IDS = {"LEFT": "PINCH_THUMB_MIDDLE", "RIGHT": "PINCH_THUMB_RING",
             "DOUBLE": "PINCH_THUMB_INDEX", "MIDDLE": "PINCH_THUMB_PINKY"}
PINCH_INVOLVES = {"LEFT": "M", "RIGHT": "R", "DOUBLE": "I", "MIDDLE": "P"}
PINCH_JOINTS = {"LEFT": (12, 9), "RIGHT": (16, 13), "DOUBLE": (8, 5), "MIDDLE": (20, 17)}
PINCH_COLOR = {"LEFT": (0, 255, 0), "RIGHT": (0, 100, 255),
               "DOUBLE": (255, 0, 255), "MIDDLE": (255, 255, 0)}

TITLES = {
    "OPEN": "Open palm", "POINT": "Index finger only", "FIST": "Fist",
    "SCROLL": "Two fingers (V)", "ZOOM": "Three fingers",
    "THUMB_UP": "Thumbs up", "THUMB_DOWN": "Thumbs down", "ROCK": "Rock sign",
    "SHAKA": "Shaka (thumb+pinky)", "ILY": "Thumb+index+pinky",
    "FOUR": "4 fingers, thumb tucked", "OTHER": "Moving hand",
    "PINCH_THUMB_MIDDLE": "Pinch thumb+middle", "PINCH_THUMB_RING": "Pinch thumb+ring",
    "PINCH_THUMB_INDEX": "Pinch thumb+index", "PINCH_THUMB_PINKY": "Pinch thumb+pinky",
}
KINDS = {}
for _p in POSES:
    KINDS[_p] = "pose"
    KINDS[_p + "_FLICK_LEFT"] = "flick"
    KINDS[_p + "_FLICK_RIGHT"] = "flick"
    TITLES[_p + "_FLICK_LEFT"] = TITLES[_p] + ", flick left"
    TITLES[_p + "_FLICK_RIGHT"] = TITLES[_p] + ", flick right"
for _g in PINCH_IDS.values():
    KINDS[_g] = "pinch"

CONTINUOUS = {"move", "precision_move", "freeze", "scroll", "hscroll", "zoom", "window_switcher"}
ONE_SHOT = {"key", "hotkey", "click", "double_click", "scroll_once", "type", "open", "run"}
ALL_ACTIONS = CONTINUOUS | ONE_SHOT | {"click_drag", "none"}
NEEDS = {"key": "key", "hotkey": "keys", "type": "text", "open": "target", "run": "command"}
WHEN = ("hold", "enter", "repeat")


def _hk(label, *keys, when="hold"):
    return {"do": "hotkey", "keys": list(keys), "label": label, "when": when}


def _key(label, key, when="hold"):
    return {"do": "key", "key": key, "label": label, "when": when}


PRESETS = {
    # cursor / mode actions
    "move": {"do": "move", "label": "move cursor"},
    "precision_move": {"do": "precision_move", "label": "precise slow move"},
    "freeze": {"do": "freeze", "label": "freeze cursor"},
    "none": {"do": "none", "label": "disabled"},
    "scroll": {"do": "scroll", "label": "scroll (hand up/down)"},
    "horizontal_scroll": {"do": "hscroll", "label": "side scroll (hand left/right)"},
    "zoom": {"do": "zoom", "label": "zoom (Ctrl+scroll)"},
    "window_switcher": {"do": "window_switcher", "label": "Alt+Tab switcher"},
    # mouse buttons
    "click_drag": {"do": "click_drag", "button": "left", "label": "left click / drag"},
    "left_click": {"do": "click", "button": "left", "label": "left click"},
    "right_click": {"do": "click", "button": "right", "label": "right click"},
    "middle_click": {"do": "click", "button": "middle", "label": "middle click"},
    "double_click": {"do": "double_click", "label": "double click"},
    # media
    "volume_up": _key("volume up", "volumeup", "repeat"),
    "volume_down": _key("volume down", "volumedown", "repeat"),
    "mute": _key("mute", "volumemute"),
    "play_pause": _key("play / pause", "playpause"),
    "next_track": _key("next track", "nexttrack"),
    "prev_track": _key("previous track", "prevtrack"),
    # windows / browser
    "screenshot": _hk("screenshot", "win", "shift", "s"),
    "back": _hk("back", "alt", "left"),
    "forward": _hk("forward", "alt", "right"),
    "show_desktop": _hk("show desktop", "win", "d"),
    "task_view": _hk("task view", "win", "tab"),
    "lock_screen": _hk("lock screen", "win", "l"),
    "minimize_window": _hk("minimize / restore window", "win", "down"),
    "maximize_window": _hk("maximize window", "win", "up"),
    "close_window": _hk("close window", "alt", "f4"),
    "close_tab": _hk("close tab", "ctrl", "w"),
    "new_tab": _hk("new tab", "ctrl", "t"),
    "next_tab": _hk("next tab", "ctrl", "tab"),
    "prev_tab": _hk("previous tab", "ctrl", "shift", "tab"),
    "next_desktop": _hk("next virtual desktop", "ctrl", "win", "right"),
    "prev_desktop": _hk("previous virtual desktop", "ctrl", "win", "left"),
    "clipboard_history": _hk("clipboard history", "win", "v"),
    "emoji_panel": _hk("emoji panel", "win", "."),
    "refresh": _key("refresh", "f5"),
    # editing
    "copy": _hk("copy", "ctrl", "c"),
    "cut": _hk("cut", "ctrl", "x"),
    "paste": _hk("paste", "ctrl", "v"),
    "undo": _hk("undo", "ctrl", "z"),
    "redo": _hk("redo", "ctrl", "y"),
    "select_all": _hk("select all", "ctrl", "a"),
    "save": _hk("save", "ctrl", "s"),
    "find": _hk("find", "ctrl", "f"),
    "enter": _key("Enter", "enter"),
    "escape": _key("Escape", "esc"),
    "space": _key("Space", "space"),
    "page_up": _key("page up", "pageup", "repeat"),
    "page_down": _key("page down", "pagedown", "repeat"),
    "scroll_up_step": {"do": "scroll_once", "amount": 360, "label": "scroll up a step", "when": "repeat"},
    "scroll_down_step": {"do": "scroll_once", "amount": -360, "label": "scroll down a step", "when": "repeat"},
    # launchers
    "open_calculator": {"do": "open", "target": "calc.exe", "label": "open Calculator"},
    "open_notepad": {"do": "open", "target": "notepad.exe", "label": "open Notepad"},
    "open_browser": {"do": "open", "target": "https://www.google.com", "label": "open browser"},
}

DEFAULT_MAP = {
    "OPEN": "move", "POINT": "precision_move", "FIST": "freeze",
    "PINCH_THUMB_MIDDLE": "click_drag", "PINCH_THUMB_RING": "right_click",
    "PINCH_THUMB_INDEX": "double_click", "PINCH_THUMB_PINKY": "middle_click",
    "SCROLL": "scroll", "ZOOM": "zoom",
    "THUMB_UP": "volume_up", "THUMB_DOWN": "volume_down",
    "ROCK": "play_pause", "SHAKA": "mute", "ILY": "screenshot", "FOUR": "window_switcher",
    "SCROLL_FLICK_LEFT": "back", "SCROLL_FLICK_RIGHT": "forward",
    "ROCK_FLICK_LEFT": "prev_track", "ROCK_FLICK_RIGHT": "next_track",
}

DEFAULT_SETTINGS = {
    "smoothing": 4.0, "precision_smoothing": 10.0, "frame_margin": 110.0,
    "dwell": 0.45, "repeat_every": 0.2, "drag_hold_time": 0.30, "action_cooldown": 0.6,
    "pinch_press": 0.25, "pinch_release": 0.35, "curl_press": 0.38, "curl_hold": 0.25,
    "scroll_gain": 8.0, "flick_px": 110.0, "flick_window": 0.30, "nav_cooldown": 0.8,
    "switch_step_px": 70.0, "thumb_tuck": 0.35,
}


# ---------------- Config: load / validate / write ----------------
def valid_keys():
    return {str(k).lower() for k in getattr(pyautogui, "KEYBOARD_KEYS", [])}


def resolve_spec(value):
    """Turn a preset name or an object from the JSON into an action dict."""
    if isinstance(value, str):
        name = value.strip().lower().replace(" ", "_").replace("-", "_")
        if name not in PRESETS:
            return None, f"unknown preset '{value}' (see _available_presets)"
        spec = dict(PRESETS[name])
        spec["preset"] = name
        return spec, None
    if isinstance(value, dict):
        spec = {}
        if "preset" in value:
            name = str(value["preset"]).strip().lower().replace(" ", "_")
            if name not in PRESETS:
                return None, f"unknown preset '{value['preset']}'"
            spec.update(PRESETS[name])
        spec.update(value)
        if "do" not in spec:
            return None, "missing \"do\" (or \"preset\")"
        return spec, None
    return None, "must be a preset name or an object like {\"do\": ...}"


def validate_spec(spec, kind):
    d = spec.get("do")
    if d not in ALL_ACTIONS:
        return f"unknown action '{d}'"
    if kind == "pinch" and d in CONTINUOUS:
        return f"'{d}' only works for hand poses, not pinches"
    if kind == "pose" and d == "click_drag":
        return "'click_drag' only works for pinch gestures"
    if kind == "flick" and (d in CONTINUOUS or d == "click_drag"):
        return f"'{d}' can't be used for a flick (use a key, hotkey, click, open...)"
    if d in NEEDS and NEEDS[d] not in spec:
        return f"'{d}' needs \"{NEEDS[d]}\""
    if d == "hotkey":
        ks = spec["keys"]
        if not isinstance(ks, list) or not ks or not all(isinstance(k, str) for k in ks):
            return "\"keys\" must be a list like [\"ctrl\", \"c\"]"
    names = []
    if d == "key":
        names = [spec["key"]]
    elif d == "hotkey":
        names = spec["keys"]
    vk = valid_keys()
    if vk:
        for k in names:
            if str(k).lower() not in vk:
                return f"'{k}' is not a valid key name"
    if d in ("click",) and spec.get("button", "left") not in ("left", "right", "middle"):
        return "\"button\" must be left, right or middle"
    if "when" in spec and spec["when"] not in WHEN:
        return "\"when\" must be hold, enter or repeat"
    if d == "scroll_once":
        try:
            int(spec.get("amount", 300))
        except (TypeError, ValueError):
            return "\"amount\" must be a number"
    return None


def load_config(path):
    """Read gestures.json -> (settings, gestures, errors). Raises on unreadable JSON."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("top level must be an object { ... }")
    errors = []
    settings = dict(DEFAULT_SETTINGS)
    for k, v in (data.get("settings") or {}).items():
        if k.startswith("_"):
            continue
        if k not in DEFAULT_SETTINGS:
            errors.append(f"settings: unknown setting '{k}'")
            continue
        try:
            fv = float(v)
            if fv <= 0:
                raise ValueError
            settings[k] = fv
        except (TypeError, ValueError):
            errors.append(f"settings: '{k}' must be a positive number")
    settings["smoothing"] = max(1.0, settings["smoothing"])
    settings["precision_smoothing"] = max(1.0, settings["precision_smoothing"])

    gestures = {}
    for gid, val in (data.get("gestures") or {}).items():
        if gid.startswith("_"):
            continue
        key = gid.strip().upper()
        if key not in KINDS:
            errors.append(f"unknown gesture '{gid}' (see _gesture_names in the file)")
            continue
        spec, err = resolve_spec(val)
        if err is None:
            err = validate_spec(spec, KINDS[key])
        if err:
            errors.append(f"{key}: {err}  (default kept)")
            continue
        gestures[key] = spec
    for gid, preset in DEFAULT_MAP.items():
        if gid not in gestures:
            gestures[gid] = resolve_spec(preset)[0]
    # any pose the user never mentioned and has no default stays unmapped (= nothing)
    return settings, gestures, errors


def default_gestures():
    return {gid: resolve_spec(p)[0] for gid, p in DEFAULT_MAP.items()}


def write_default_config(path):
    doc = {
        "_help": [
            "Edit the \"gestures\" section to change what each gesture does. Save the file - it applies within a second.",
            "A value can be a PRESET NAME (see _available_presets) or a custom object, for example:",
            "  \"SHAKA\": {\"do\": \"open\", \"target\": \"notepad.exe\"}",
            "  \"ROCK\": {\"do\": \"hotkey\", \"keys\": [\"ctrl\", \"shift\", \"esc\"], \"when\": \"hold\"}",
            "  \"THUMB_UP\": {\"do\": \"type\", \"text\": \"Hello!\", \"when\": \"hold\"}",
            "Use \"none\" to disable a gesture. Delete a line to restore its default.",
            "\"when\" for one-shot actions on a pose: hold (default), enter (instant) or repeat (keeps firing).",
            "Pose-only actions: move, precision_move, freeze, scroll, hscroll, zoom, window_switcher.",
            "Pinch-only action: click_drag.  Anywhere: click, double_click, key, hotkey, scroll_once, type, open, run.",
            "Flick gestures (e.g. SCROLL_FLICK_LEFT) fire when you flick your hand sideways in that pose.",
            "You can add flicks for any pose, e.g. \"FIST_FLICK_RIGHT\": \"next_tab\".",
        ],
        "settings": dict(DEFAULT_SETTINGS),
        "gestures": dict(DEFAULT_MAP),
        "_gesture_names": {gid: TITLES[gid] for gid in KINDS},
        "_available_presets": sorted(PRESETS),
    }
    Path(path).write_text(json.dumps(doc, indent=2), encoding="utf-8")


def describe(spec):
    if spec is None:
        return "nothing"
    if spec.get("label"):
        txt = spec["label"]
    else:
        d = spec["do"]
        if d == "key":
            txt = f"key {spec['key']}"
        elif d == "hotkey":
            txt = "+".join(spec["keys"])
        elif d == "click":
            txt = f"{spec.get('button', 'left')} click"
        elif d == "type":
            txt = f"type \"{str(spec['text'])[:14]}\""
        elif d == "open":
            txt = f"open {spec['target']}"
        elif d == "run":
            txt = f"run {str(spec['command'])[:18]}"
        elif d == "scroll_once":
            txt = "scroll step"
        else:
            txt = d.replace("_", " ")
    if spec.get("do") in ONE_SHOT and spec.get("when") == "enter":
        txt += " (instant)"
    return txt


def build_legend(G):
    lines = []
    order = POSES[:] + [PINCH_IDS[k] for k in ("LEFT", "RIGHT", "DOUBLE", "MIDDLE")]
    for gid in order:
        lines.append((gid, f"{TITLES[gid]}: {describe(G.get(gid))}"))
    for gid in sorted(G):
        if KINDS.get(gid) == "flick" and G[gid]["do"] != "none":
            lines.append((gid, f"{TITLES[gid]}: {describe(G[gid])}"))
    return lines


def cmd_list(path):
    if not Path(path).exists():
        write_default_config(path)
    try:
        _, G, errs = load_config(path)
    except Exception as e:
        print(f"Could not read {path}: {e}")
        return
    print(f"Gesture map from {path}\n")
    for gid, text in build_legend(G):
        print(f"  {gid:24s} {text.split(': ', 1)[1]}")
    for e in errs:
        print("  problem:", e)
    print("\nPresets you can use as values:\n  " + ", ".join(sorted(PRESETS)))


# ---------------- Actions ----------------
def open_target(target):
    """Open an app, file or URL."""
    t = str(target)
    if t.lower().startswith(("http://", "https://")):
        webbrowser.open(t)
    elif sys.platform == "win32":
        os.startfile(t)
    else:
        subprocess.Popen(t, shell=True)


def perform(spec):
    """Run a one-shot action."""
    d = spec["do"]
    if d == "key":
        pyautogui.press(spec["key"])
    elif d == "hotkey":
        pyautogui.hotkey(*spec["keys"])
    elif d == "click":
        pyautogui.click(button=spec.get("button", "left"), clicks=int(spec.get("clicks", 1)))
    elif d == "double_click":
        pyautogui.doubleClick()
    elif d == "scroll_once":
        pyautogui.scroll(int(spec.get("amount", 300)))
    elif d == "type":
        pyautogui.write(str(spec["text"]), interval=0.01)
    elif d == "open":
        open_target(spec["target"])
    elif d == "run":
        subprocess.Popen(str(spec["command"]), shell=True)


# ---------------- OS helpers ----------------
def vk_down(vk):
    """Global key state (works even when another app has focus). Windows only."""
    if sys.platform != "win32":
        return False
    import ctypes
    return bool(ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000)


def set_topmost(title):
    if sys.platform != "win32":
        return
    try:
        import ctypes
        hwnd = ctypes.windll.user32.FindWindowW(None, title)
        if hwnd:
            ctypes.windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010)
    except Exception:
        pass


def beep(freq, ms=70, times=1):
    if sys.platform != "win32":
        return

    def _run():
        try:
            import winsound
            for _ in range(times):
                winsound.Beep(freq, ms)
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()


def edit_file(path):
    try:
        if sys.platform == "win32":
            os.startfile(str(path))
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except Exception as e:
        print(f"Could not open editor: {e}\nOpen this file manually: {path}")


def tune_process():
    """Stop Windows from slowing this program down when its window is in the background."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        from ctypes import wintypes
        k32 = ctypes.windll.kernel32
        proc = k32.GetCurrentProcess()
        k32.SetPriorityClass(proc, 0x00008000)                 # ABOVE_NORMAL priority

        class _PowerThrottle(ctypes.Structure):
            _fields_ = [("Version", wintypes.ULONG), ("ControlMask", wintypes.ULONG),
                        ("StateMask", wintypes.ULONG)]
        # opt out of EcoQoS speed throttling (0x1) and of ignored timer resolution (0x4)
        pt = _PowerThrottle(1, 0x1 | 0x4, 0x0)
        k32.SetProcessInformation(proc, 4, ctypes.byref(pt), ctypes.sizeof(pt))
        ctypes.windll.winmm.timeBeginPeriod(1)                 # 1 ms timer resolution
        # keep the PC and screen awake while the program runs
        k32.SetThreadExecutionState(ctypes.c_uint(0x80000000 | 0x1 | 0x2))
    except Exception:
        pass


def restore_process():
    if sys.platform != "win32":
        return
    try:
        import ctypes
        ctypes.windll.winmm.timeEndPeriod(1)
        ctypes.windll.kernel32.SetThreadExecutionState(ctypes.c_uint(0x80000000))
    except Exception:
        pass


def foreground_title():
    """Title of the window currently in front (for --debug)."""
    if sys.platform != "win32":
        return ""
    try:
        import ctypes
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        buf = ctypes.create_unicode_buffer(256)
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, 256)
        return buf.value
    except Exception:
        return ""


def is_admin():
    if sys.platform != "win32":
        return False
    try:
        import ctypes
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def relaunch_as_admin():
    """Restart this script with Administrator rights (shows the Windows UAC prompt)."""
    import ctypes
    params = " ".join(f'"{a}"' for a in sys.argv if a != "--admin")
    ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)


def open_camera(index):
    backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
    cap = cv2.VideoCapture(index, backend)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_H)
    return cap


def ensure_model():
    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 1_000_000:
        return str(MODEL_PATH)
    print("Downloading hand tracking model (~8 MB, one time only)...")
    tmp = MODEL_PATH.with_suffix(".part")
    try:
        urllib.request.urlretrieve(MODEL_URL, tmp)
        tmp.replace(MODEL_PATH)
    except Exception as e:
        raise SystemExit(
            f"\nCould not download the model automatically ({e}).\n"
            f"Download it manually from:\n  {MODEL_URL}\n"
            f"and save it as:\n  {MODEL_PATH}\nThen run the script again.")
    print("Model ready.")
    return str(MODEL_PATH)


def parse_args():
    ap = argparse.ArgumentParser(description="Hand gesture mouse controller (customizable)")
    ap.add_argument("--view", choices=["full", "mini", "hidden"], default="full")
    ap.add_argument("--no-control", action="store_true", help="start in demo mode")
    ap.add_argument("--camera", type=int, default=CAM_INDEX)
    ap.add_argument("--config", default=str(CONFIG_PATH), help="path to gestures.json")
    ap.add_argument("--list", action="store_true", help="print the gesture map and exit")
    ap.add_argument("--edit", action="store_true", help="open gestures.json and exit")
    ap.add_argument("--reset-config", action="store_true", help="restore default gestures.json")
    ap.add_argument("--debug", action="store_true", help="print FPS and the front app every 2 seconds")
    ap.add_argument("--admin", action="store_true", help="restart as Administrator")
    return ap.parse_known_args()[0]


# ---------------- Gesture detection ----------------
def dist(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)


def finger_states(p):
    wrist = p[0]

    def ext(tip, pip):
        return dist(p[tip], wrist) > dist(p[pip], wrist) * 1.1

    return {
        "T": dist(p[4], p[5]) > dist(p[3], p[5]) * 1.2,
        "I": ext(8, 6), "M": ext(12, 10), "R": ext(16, 14), "P": ext(20, 18),
    }


def classify_pose(p, hs, fs, tuck=0.35):
    i, m, r, pk, t = fs["I"], fs["M"], fs["R"], fs["P"], fs["T"]
    tucked = dist(p[4], p[5]) / hs < tuck
    if i and m and r and pk:
        return "FOUR" if tucked else "OPEN"
    if i and m and r and not pk:
        return "ZOOM"
    if i and m and not r and not pk:
        return "SCROLL"
    if i and pk and not m and not r:
        return "ILY" if t else "ROCK"
    if i and not (m or r or pk):
        return "POINT"
    if pk and not (i or m or r):
        return "SHAKA" if t else "OTHER"
    if not (i or m or r or pk):
        if t:
            if p[4].y < p[5].y - 0.3 * hs:
                return "THUMB_UP"
            if p[4].y > p[5].y + 0.5 * hs:
                return "THUMB_DOWN"
        return "FIST"
    return "OTHER"


# ---------------- Drawing ----------------
def draw_hand(img, p):
    h, w = img.shape[:2]
    pts = [(int(q.x * w), int(q.y * h)) for q in p]
    for a, b in HAND_CONNECTIONS:
        cv2.line(img, pts[a], pts[b], (0, 255, 0), 2)
    for pt in pts:
        cv2.circle(img, pt, 4, (0, 0, 255), -1)


def draw_trail(img, pts, color, thick_max=6):
    pts = list(pts)
    for i in range(1, len(pts)):
        a = i / len(pts)
        c = tuple(int(v * a) for v in color)
        cv2.line(img, pts[i - 1], pts[i], c, max(1, int(thick_max * a)))


def build_panel(cursor, screen_trail, ripples, title, does, active_id, last_action,
                fingers, fps, control_on, hand_seen, legend):
    panel = np.full((DISP_H, PANEL_W, 3), (25, 25, 30), np.uint8)
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(panel, "SCREEN VIEW", (15, 26), font, 0.65, (200, 200, 200), 2)

    max_h = 150
    mw = PANEL_W - 30
    mh = int(mw * SCREEN_H / SCREEN_W)
    if mh > max_h:
        mh = max_h
        mw = int(mh * SCREEN_W / SCREEN_H)
    ox, oy = (PANEL_W - mw) // 2, 40
    cv2.rectangle(panel, (ox, oy), (ox + mw, oy + mh), (60, 60, 70), -1)
    cv2.rectangle(panel, (ox, oy), (ox + mw, oy + mh), (130, 130, 150), 2)

    def to_mini(pt):
        return (int(ox + pt[0] / SCREEN_W * mw), int(oy + pt[1] / SCREEN_H * mh))

    if len(screen_trail) > 1:
        draw_trail(panel, [to_mini(q) for q in screen_trail], (255, 200, 0), 4)

    now = time.time()
    for rp in list(ripples):
        age = now - rp["t"]
        if age > 0.6:
            ripples.remove(rp)
            continue
        fade = 1 - age / 0.6
        col = tuple(int(v * fade) for v in rp["color"])
        cv2.circle(panel, to_mini(rp["pos"]), int(6 + age * 45), col, 2)
    if hand_seen:
        cv2.circle(panel, to_mini(cursor), 6, (0, 255, 255), -1)
        cv2.circle(panel, to_mini(cursor), 10, (255, 255, 255), 1)

    y = oy + mh + 26
    cv2.putText(panel, f"Cursor: ({int(cursor[0])}, {int(cursor[1])})", (15, y),
                font, 0.55, (230, 230, 230), 1)
    y += 26
    cv2.putText(panel, f"Gesture: {title}", (15, y), font, 0.6, (0, 255, 120), 2)
    y += 22
    cv2.putText(panel, f"Does: {does}", (15, y), font, 0.5, (120, 255, 255), 1)
    y += 20
    act_text, act_time = last_action
    if act_text and now - act_time < 2.0:
        cv2.putText(panel, act_text[:60], (15, y), font, 0.45, (0, 200, 255), 1)
    y += 12
    for idx, name in enumerate("TIMRP"):
        x = 15 + idx * 34
        on = fingers[idx]
        cv2.rectangle(panel, (x, y), (x + 26, y + 22),
                      (0, 200, 90) if on else (55, 55, 60), -1)
        cv2.putText(panel, name, (x + 7, y + 16), font, 0.5,
                    (0, 0, 0) if on else (150, 150, 150), 1)
    mode = "MOUSE: ON" if control_on else "DEMO (mouse off)"
    cv2.putText(panel, f"{mode}   {int(fps)} FPS", (200, y + 16), font, 0.45,
                (0, 200, 255) if control_on else (0, 140, 255), 1)

    y += 46
    cv2.putText(panel, "GESTURES  (edit gestures.json to change)", (15, y), font, 0.45,
                (200, 200, 200), 1)
    y += 18
    for gid, text in legend:
        if y > DISP_H - 28:
            break
        active = (gid == active_id)
        if active:
            cv2.rectangle(panel, (8, y - 11), (PANEL_W - 8, y + 4), (60, 90, 40), -1)
        cv2.putText(panel, text[:72], (15, y), font, 0.38,
                    (255, 255, 255) if active else (150, 150, 160), 1)
        y += 15

    cv2.putText(panel, "F8 mouse on/off   F9 view   F10 quit   (c = edit gestures)",
                (15, DISP_H - 10), font, 0.4, (140, 140, 150), 1)
    return panel


def build_mini(frame, title, control_on):
    img = cv2.resize(frame, (MINI_W, MINI_H))
    cv2.rectangle(img, (0, 0), (MINI_W, 28), (0, 0, 0), -1)
    cv2.putText(img, title[:26], (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)
    tag = "ON" if control_on else "DEMO"
    cv2.putText(img, tag, (MINI_W - 62, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                (0, 200, 255) if control_on else (0, 140, 255), 2)
    cv2.putText(img, "F8 on/off  F9 view  F10 quit", (8, MINI_H - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
    return img


# ---------------- Main ----------------
def main():
    args = parse_args()
    if args.admin and sys.platform == "win32" and not is_admin():
        print("Restarting as Administrator (accept the Windows prompt)...")
        relaunch_as_admin()
        return
    cfg_path = Path(args.config)

    if args.reset_config or not cfg_path.exists():
        write_default_config(cfg_path)
        print(f"Created default gesture config: {cfg_path}")
    if args.list:
        cmd_list(cfg_path)
        return
    if args.edit:
        edit_file(cfg_path)
        return

    def read_config():
        s, g, errs = load_config(cfg_path)
        return s, g, errs

    try:
        S, G, cfg_errors = read_config()
    except Exception as e:
        print(f"Could not read {cfg_path} ({e}). Using built-in defaults.")
        S, G, cfg_errors = dict(DEFAULT_SETTINGS), default_gestures(), []
    for e in cfg_errors:
        print("gestures.json problem:", e)
    legend = build_legend(G)
    try:
        cfg_mtime = cfg_path.stat().st_mtime
    except OSError:
        cfg_mtime = 0.0
    last_cfg_check = time.time()

    cap = open_camera(args.camera)
    if not cap.isOpened():
        raise RuntimeError("Could not open camera. Try --camera 1, and close other apps using it.")

    options = vision.HandLandmarkerOptions(
        base_options=mp_tasks.BaseOptions(model_asset_path=ensure_model()),
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.6,
        min_hand_presence_confidence=0.6,
        min_tracking_confidence=0.6,
    )
    landmarker = vision.HandLandmarker.create_from_options(options)
    t0 = time.time()
    last_ts = -1

    cursor_x, cursor_y = map(float, pyautogui.position())
    offset_x = offset_y = 0.0
    cam_trail = deque(maxlen=TRAIL_LEN)
    screen_trail = deque(maxlen=TRAIL_LEN * 2)
    ripples = []
    pose_hist = deque(maxlen=POSE_VOTE)
    motion = deque()

    control_on = not args.no_control
    view_mode = args.view
    window_dirty = True
    show_trail = True
    dragging = False
    drag_button = "left"
    switching = False
    switch_pose = None
    switch_anchor = 0.0
    pinch_name = None
    pinch_spec = None
    pinch_start = 0.0
    hand_prev_seen = False
    prev_pose = None
    pose_since = 0.0
    fired = False
    last_repeat = 0.0
    hk_latch = {"ctl": False, "view": False, "quit": False}
    last_action = ("", 0.0)
    last = {"nav": 0.0}
    last_pinch = {}
    scroll_prev = None
    scroll_acc = 0.0
    prev_time = time.time()
    fail_count = 0
    err_streak = 0
    last_err_msg = ""
    dbg_last = dbg_prev_frame = time.time()
    dbg_frames = 0
    if cfg_errors:
        last_action = (f"gestures.json: {len(cfg_errors)} problem(s) - see console", time.time())

    def do(fn, *a, **k):
        if control_on:
            fn(*a, **k)

    def release_alt():
        nonlocal switching, switch_pose
        if switching:
            pyautogui.keyUp("alt")
            switching = False
            switch_pose = None

    def release_held():
        nonlocal dragging
        release_alt()
        if dragging:
            pyautogui.mouseUp(button=drag_button)
            dragging = False

    def hotkey_edge(name, vk):
        down = vk_down(vk)
        fire = down and not hk_latch[name]
        hk_latch[name] = down
        return fire

    print(f"Hand mouse running. Gestures file: {cfg_path}")
    print("F8 = mouse on/off   F9 = change view   F10 = quit   (edit gestures.json any time)")
    print("Keeps working when you switch to other apps. Emergency stop: F10 (works from any app).")
    if args.debug:
        print(f"[debug] running as administrator: {is_admin()}")
    tune_process()
    if control_on:
        beep(1000)

    try:
        while True:
            try:
                ok, frame = cap.read()
                if not ok:
                    fail_count += 1
                    if fail_count == 1:
                        print("Camera frame missing - waiting for it to come back...")
                        release_held()
                        hand_prev_seen = False
                        pinch_name = None
                        pinch_spec = None
                        pose_hist.clear()
                        motion.clear()
                        prev_pose = None
                    if fail_count % 30 == 0:
                        print("Re-opening the camera...")
                        cap.release()
                        time.sleep(0.5)
                        cap = open_camera(args.camera)
                    if fail_count > 900:
                        print("Camera is gone. Exiting.")
                        break
                    key = cv2.waitKey(30) & 0xFF
                    if hotkey_edge("quit", VK_F10) or key == ord("q"):
                        break
                    continue
                if fail_count:
                    print("Camera is back.")
                    fail_count = 0
                frame = cv2.flip(frame, 1)
                h, w, _ = frame.shape
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                ts_ms = max(int((time.time() - t0) * 1000), last_ts + 1)
                last_ts = ts_ms
                result = landmarker.detect_for_video(
                    mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts_ms)
                now = time.time()

                # ---------- live reload of gestures.json ----------
                if now - last_cfg_check > CONFIG_CHECK_EVERY:
                    last_cfg_check = now
                    try:
                        mt = cfg_path.stat().st_mtime
                    except OSError:
                        mt = cfg_mtime
                    if mt != cfg_mtime:
                        cfg_mtime = mt
                        try:
                            S, G, cfg_errors = read_config()
                            legend = build_legend(G)
                            fired = True          # don't let a half-held gesture misfire on new mapping
                            for e in cfg_errors:
                                print("gestures.json problem:", e)
                            if cfg_errors:
                                last_action = (f"Reloaded with {len(cfg_errors)} problem(s): {cfg_errors[0]}", now)
                            else:
                                last_action = ("gestures.json reloaded", now)
                                beep(900, 60)
                        except Exception as e:
                            print(f"gestures.json NOT reloaded ({e}). Keeping previous settings.")
                            last_action = (f"gestures.json error - kept old: {str(e)[:40]}", now)
                            beep(300, 200)

                fm = int(S["frame_margin"])
                cv2.rectangle(frame, (fm, fm), (w - fm, h - fm), (255, 0, 255), 2)

                title = "No hand"
                does = ""
                active_id = None
                fingers = [False] * 5
                hand_seen = False

                if result.hand_landmarks:
                    hand_seen = True
                    p = result.hand_landmarks[0]
                    draw_hand(frame, p)

                    hs = dist(p[0], p[9]) or 1e-6
                    px = sum(p[i].x for i in PALM_IDS) / len(PALM_IDS) * w
                    py = sum(p[i].y for i in PALM_IDS) / len(PALM_IDS) * h
                    cam_trail.append((int(px), int(py)))
                    motion.append((now, px, py))
                    while motion and now - motion[0][0] > 0.6:
                        motion.popleft()

                    fs = finger_states(p)
                    fingers = [fs[k] for k in "TIMRP"]

                    # ---------- pinch detection ----------
                    thumb = p[4]
                    ratios = {
                        "LEFT": dist(thumb, p[12]) / hs,
                        "RIGHT": dist(thumb, p[16]) / hs,
                        "DOUBLE": dist(thumb, p[8]) / hs,
                        "MIDDLE": dist(thumb, p[20]) / hs,
                    }

                    def finger_open(name):
                        tip, knuckle = PINCH_JOINTS[name]
                        return dist(p[tip], p[knuckle]) / hs

                    if pinch_name and ratios[pinch_name] < S["pinch_release"] \
                            and finger_open(pinch_name) > S["curl_hold"]:
                        active = pinch_name
                    else:
                        active = None
                        valid = {k: v for k, v in ratios.items() if finger_open(k) > S["curl_press"]}
                        if valid:
                            cand = min(valid, key=valid.get)
                            others = [k for k in "IMRP" if k != PINCH_INVOLVES[cand]]
                            if valid[cand] < S["pinch_press"] and any(fs[k] for k in others):
                                active = cand

                    if active != pinch_name:
                        # release of the previous pinch
                        if pinch_name is not None and pinch_spec and pinch_spec["do"] == "click_drag":
                            btn = pinch_spec.get("button", "left")
                            if dragging:
                                do(pyautogui.mouseUp, button=btn)
                                dragging = False
                                last_action = ("Drop", now)
                            else:
                                do(pyautogui.click, button=btn)
                                last_action = (f"{btn.capitalize()} click", now)
                                ripples.append({"t": now, "pos": (cursor_x, cursor_y),
                                                "color": PINCH_COLOR[pinch_name]})
                        pinch_name = active
                        pinch_start = now
                        pinch_spec = G.get(PINCH_IDS[active]) if active else None
                        if pinch_spec and pinch_spec["do"] not in ("click_drag", "none"):
                            pid = PINCH_IDS[active]
                            if now - last_pinch.get(pid, 0.0) > S["action_cooldown"]:
                                last_pinch[pid] = now
                                do(perform, pinch_spec)
                                last_action = (describe(pinch_spec), now)
                                ripples.append({"t": now, "pos": (cursor_x, cursor_y),
                                                "color": PINCH_COLOR[active]})

                    if pinch_spec and pinch_spec["do"] == "click_drag" and pinch_name \
                            and not dragging and now - pinch_start > S["drag_hold_time"]:
                        drag_button = pinch_spec.get("button", "left")
                        do(pyautogui.mouseDown, button=drag_button)
                        dragging = True
                        last_action = ("Drag start", now)
                        ripples.append({"t": now, "pos": (cursor_x, cursor_y),
                                        "color": PINCH_COLOR[pinch_name]})

                    # ---------- pose detection (voted) ----------
                    raw_pose = classify_pose(p, hs, fs, S["thumb_tuck"])
                    pose_hist.append(raw_pose)
                    pose = Counter(pose_hist).most_common(1)[0][0]
                    stable = (raw_pose == pose)

                    if pose != prev_pose:
                        pose_since = now
                        prev_pose = pose
                        fired = False
                        if switching and pose != switch_pose:
                            release_alt()
                    held = now - pose_since

                    if pinch_name is not None:
                        release_alt()

                    pose_spec = G.get(pose) if pose != "OTHER" else None
                    d = pose_spec["do"] if pose_spec else "move"

                    # ---------- pose actions ----------
                    if pinch_name is None:
                        # continuous: scroll / hscroll / zoom
                        if d in ("scroll", "zoom", "hscroll"):
                            cur = px if d == "hscroll" else py
                            if scroll_prev is None:
                                scroll_prev = cur
                            delta = (cur - scroll_prev) if d == "hscroll" else (scroll_prev - cur)
                            scroll_prev = cur
                            if abs(delta) < 1.0:
                                delta = 0
                            scroll_acc += delta * float(pose_spec.get("gain", S["scroll_gain"]))
                            if abs(scroll_acc) >= 30 and stable:
                                amt = int(scroll_acc)
                                scroll_acc -= amt
                                if d == "scroll":
                                    do(pyautogui.scroll, amt)
                                    last_action = ("Scroll " + ("UP" if amt > 0 else "DOWN"), now)
                                elif d == "hscroll":
                                    do(pyautogui.hscroll, amt)
                                    last_action = ("Scroll " + ("RIGHT" if amt > 0 else "LEFT"), now)
                                else:
                                    if control_on:
                                        pyautogui.keyDown("ctrl")
                                        pyautogui.scroll(amt)
                                        pyautogui.keyUp("ctrl")
                                    last_action = ("Zoom " + ("IN" if amt > 0 else "OUT"), now)
                        else:
                            scroll_prev = None
                            scroll_acc = 0.0

                        # flicks (only if this pose has a flick action configured)
                        fl_left = G.get(f"{pose}_FLICK_LEFT")
                        fl_right = G.get(f"{pose}_FLICK_RIGHT")
                        has_flick = any(s and s["do"] != "none" for s in (fl_left, fl_right))
                        if has_flick and stable and now - last["nav"] > S["nav_cooldown"] \
                                and (d in CONTINUOUS or not fired):
                            recent = [m for m in motion
                                      if now - m[0] <= S["flick_window"] and m[0] >= pose_since]
                            if len(recent) >= 3:
                                dxm = px - recent[0][1]
                                dym = py - recent[0][2]
                                if abs(dxm) > S["flick_px"] and abs(dxm) > 2.5 * abs(dym):
                                    fspec = fl_right if dxm > 0 else fl_left
                                    if fspec and fspec["do"] != "none":
                                        last["nav"] = now
                                        scroll_acc = 0.0
                                        fired = True
                                        do(perform, fspec)
                                        last_action = (describe(fspec), now)
                                        beep(1100, 40)

                        # one-shot actions on a pose
                        if d in ONE_SHOT and stable:
                            when = pose_spec.get("when", "hold")
                            if when == "enter" and not fired:
                                fired = True
                                do(perform, pose_spec)
                                last_action = (describe(pose_spec), now)
                                beep(1100, 40)
                            elif when == "hold" and not fired \
                                    and held > float(pose_spec.get("dwell", S["dwell"])):
                                fired = True
                                do(perform, pose_spec)
                                last_action = (describe(pose_spec), now)
                                beep(1100, 40)
                            elif when == "repeat" and held > 0.05 \
                                    and now - last_repeat > float(pose_spec.get("every", S["repeat_every"])):
                                last_repeat = now
                                do(perform, pose_spec)
                                last_action = (describe(pose_spec), now)

                        # window switcher (Alt+Tab)
                        if d == "window_switcher" and stable \
                                and held > float(pose_spec.get("dwell", S["dwell"])):
                            if not switching:
                                if control_on:
                                    pyautogui.keyDown("alt")
                                    pyautogui.press("tab")
                                    switching = True
                                    switch_pose = pose
                                switch_anchor = px
                                last_action = ("Window switcher", now)
                            else:
                                step = S["switch_step_px"]
                                if px - switch_anchor > step:
                                    pyautogui.press("tab")
                                    switch_anchor = px
                                elif switch_anchor - px > step:
                                    pyautogui.keyDown("shift")
                                    pyautogui.press("tab")
                                    pyautogui.keyUp("shift")
                                    switch_anchor = px
                    else:
                        scroll_prev = None
                        scroll_acc = 0.0

                    # ---------- what to show ----------
                    if pinch_name:
                        active_id = PINCH_IDS[pinch_name]
                        does = describe(G.get(active_id))
                    else:
                        active_id = pose
                        does = describe(pose_spec) if pose_spec else "move cursor"
                    title = TITLES.get(active_id, active_id)

                    # ---------- cursor movement ----------
                    moves = (pinch_name is None) and d in ("move", "precision_move")
                    raw_x = float(np.interp(px, (fm, w - fm), (0, SCREEN_W)))
                    raw_y = float(np.interp(py, (fm, h - fm), (0, SCREEN_H)))
                    frozen = (not hand_prev_seen) \
                        or (pinch_name is not None and not dragging) \
                        or (pinch_name is None and not moves)

                    if frozen:
                        offset_x = cursor_x - raw_x
                        offset_y = cursor_y - raw_y
                    else:
                        tx = float(np.clip(raw_x + offset_x, 5, SCREEN_W - 6))
                        ty = float(np.clip(raw_y + offset_y, 5, SCREEN_H - 6))
                        s = S["precision_smoothing"] if (pinch_name is None and d == "precision_move") \
                            else S["smoothing"]
                        cursor_x += (tx - cursor_x) / s
                        cursor_y += (ty - cursor_y) / s
                        do(pyautogui.moveTo, cursor_x, cursor_y)
                        screen_trail.append((cursor_x, cursor_y))

                    col = PINCH_COLOR[pinch_name] if pinch_name else (0, 255, 255)
                    cv2.circle(frame, (int(px), int(py)), 10, (0, 255, 255), -1)
                    if pinch_name or not moves or d == "precision_move":
                        cv2.circle(frame, (int(px), int(py)), 24, col, 3)
                else:
                    cam_trail.clear()
                    pose_hist.clear()
                    motion.clear()
                    prev_pose = None
                    fired = False
                    scroll_prev = None
                    scroll_acc = 0.0
                    release_alt()
                    if dragging:
                        do(pyautogui.mouseUp, button=drag_button)
                        dragging = False
                    pinch_name = None
                    pinch_spec = None

                hand_prev_seen = hand_seen

                if show_trail:
                    draw_trail(frame, cam_trail, (0, 255, 255))
                cv2.putText(frame, f"{title}: {does}" if does else title, (10, 32),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                fps = 1 / max(time.time() - prev_time, 1e-6)
                prev_time = time.time()

                if args.debug:
                    dbg_frames += 1
                    if now - dbg_prev_frame > 0.6:
                        print(f"[debug] STALL {now - dbg_prev_frame:.1f}s (front app: '{foreground_title()}')")
                    dbg_prev_frame = now
                    if now - dbg_last >= 2.0:
                        print(f"[debug] {dbg_frames / (now - dbg_last):.1f} fps | hand={'yes' if hand_seen else 'no'} | "
                              f"control={'ON' if control_on else 'off'} | front app: '{foreground_title()}'")
                        dbg_frames = 0
                        dbg_last = now

                # ---------- display ----------
                if view_mode == "full":
                    view = cv2.resize(frame, (DISP_W, DISP_H))
                    panel = build_panel((cursor_x, cursor_y),
                                        screen_trail if show_trail else [],
                                        ripples, title, does, active_id, last_action,
                                        fingers, fps, control_on, hand_seen, legend)
                    cv2.imshow(WIN_FULL, np.hstack([view, panel]))
                elif view_mode == "mini":
                    cv2.imshow(WIN_MINI, build_mini(frame, f"{title}: {does}" if does else title, control_on))
                    if window_dirty:
                        cv2.moveWindow(WIN_MINI, SCREEN_W - MINI_W - 20, SCREEN_H - MINI_H - 90)
                        set_topmost(WIN_MINI)
                window_dirty = False

                # ---------- keys: window keys + GLOBAL hotkeys ----------
                key = cv2.waitKey(1) & 0xFF

                if hotkey_edge("quit", VK_F10) or key == ord("q"):
                    break

                if hotkey_edge("ctl", VK_F8) or key == ord("m"):
                    control_on = not control_on
                    if not control_on:
                        if dragging:
                            pyautogui.mouseUp(button=drag_button)
                            dragging = False
                        release_alt()
                        beep(500, 120)
                    else:
                        beep(1000, 120)
                    last_action = ("Mouse ON" if control_on else "Demo mode", now)

                if hotkey_edge("view", VK_F9) or key == ord("v"):
                    order = ["full", "mini", "hidden"]
                    view_mode = order[(order.index(view_mode) + 1) % 3]
                    cv2.destroyAllWindows()
                    window_dirty = True
                    beep(800, 50, times=2)

                if key == ord("c"):
                    edit_file(cfg_path)
                elif key == ord("t"):
                    show_trail = not show_trail
                elif key == ord("r"):
                    offset_x = offset_y = 0.0
                err_streak = 0
            except Exception:
                err_streak += 1
                msg = traceback.format_exc()
                if err_streak == 1 or msg != last_err_msg:
                    print("Frame error (continuing):\n" + msg)
                    last_err_msg = msg
                try:
                    release_held()
                except Exception:
                    pass
                if err_streak > 100:
                    raise
                if hotkey_edge("quit", VK_F10):
                    break
                time.sleep(0.02)
    finally:
        release_alt()
        if dragging:
            pyautogui.mouseUp(button=drag_button)
        cap.release()
        cv2.destroyAllWindows()
        landmarker.close()
        restore_process()
        beep(400, 150)


if __name__ == "__main__":
    main()
