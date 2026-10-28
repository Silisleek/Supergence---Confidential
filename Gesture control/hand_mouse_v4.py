"""
Hand Tracking Virtual Mouse v4 - works on new Python (3.13 / 3.14) too
----------------------------------------------------------------------
Install:  pip install mediapipe opencv-python numpy pyautogui
Python:   3.10+ (tested design target: 3.14)
Model:    downloads 'hand_landmarker.task' (~8 MB) next to this script on first run.
          If the auto-download fails, save it manually from:
          https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

Keep your hand upright (fingers pointing up) facing the camera.

GESTURES
  Open palm ................ move cursor (palm center follows your hand)
  Index finger only ........ PRECISION move (slower, steadier)
  Fist ..................... CLUTCH: freeze cursor so you can reposition your hand
  Pinch thumb + middle ..... LEFT click (quick)  /  DRAG (hold ~0.3s)
  Pinch thumb + ring ....... RIGHT click
  Pinch thumb + index ...... DOUBLE click
  Pinch thumb + pinky ...... MIDDLE click
  Two fingers up (V) ....... SCROLL: move hand up / down
  Three fingers up ......... ZOOM (Ctrl + scroll): move hand up / down
  Thumbs up / thumbs down .. VOLUME up / down
  Rock sign (index+pinky) .. PLAY / PAUSE media

KEYS (in the window)
  m -> mouse control ON/OFF (OFF = demo mode, tracking only)
  t -> toggle trail      r -> reset cursor offset      q -> quit
"""

import sys
import time
import math
import urllib.request
from pathlib import Path
from collections import deque, Counter

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
import pyautogui

# ---------------- Settings ----------------
CAM_INDEX = 0
CAM_W, CAM_H = 640, 480
DISP_W, DISP_H = 800, 600       # size the camera view is shown at
PANEL_W = 440                   # showcase panel width
FRAME_MARGIN = 110              # active box margin (camera px)
SMOOTHING = 4                   # normal move smoothing (higher = smoother/laggier)
PRECISION_SMOOTHING = 10        # smoothing in precision (index-only) mode
PINCH_PRESS = 0.25              # pinch triggers below this (relative to hand size)
PINCH_RELEASE = 0.35            # pinch releases above this (hysteresis = no flicker)
CURL_PRESS = 0.38               # pinching finger must be this open (x hand size) to start a pinch
CURL_HOLD = 0.25                # ...and this open to keep one (stops curled-finger false clicks)
DRAG_HOLD_TIME = 0.30           # seconds to hold left pinch before drag starts
ACTION_COOLDOWN = 0.6           # cooldown for right/double/middle click
SCROLL_GAIN = 8                 # wheel units per camera pixel of hand movement
VOLUME_COOLDOWN = 0.2
MEDIA_COOLDOWN = 1.2
POSE_VOTE = 4                   # frames of voting to stabilise pose detection
TRAIL_LEN = 25

pyautogui.FAILSAFE = True       # slam mouse into a corner to abort
pyautogui.PAUSE = 0
SCREEN_W, SCREEN_H = pyautogui.size()

MODEL_URL = ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
             "hand_landmarker/float16/1/hand_landmarker.task")
MODEL_PATH = Path(__file__).resolve().with_name("hand_landmarker.task")

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20),
]


def ensure_model():
    """Return the path to the hand model, downloading it once if missing."""
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


def draw_hand(img, p):
    """Draw the hand skeleton (replacement for the removed mp.solutions drawing utils)."""
    h, w = img.shape[:2]
    pts = [(int(q.x * w), int(q.y * h)) for q in p]
    for a, b in HAND_CONNECTIONS:
        cv2.line(img, pts[a], pts[b], (0, 255, 0), 2)
    for pt in pts:
        cv2.circle(img, pt, 4, (0, 0, 255), -1)

PALM_IDS = (0, 5, 9, 13, 17)
FREEZE_POSES = ("FIST", "SCROLL", "ZOOM", "THUMB_UP", "THUMB_DOWN", "ROCK")

POSE_STATUS = {
    "OPEN": "MOVE", "OTHER": "MOVE", "POINT": "PRECISION", "FIST": "CLUTCH",
    "SCROLL": "SCROLL", "ZOOM": "ZOOM", "THUMB_UP": "VOLUME UP",
    "THUMB_DOWN": "VOLUME DOWN", "ROCK": "PLAY/PAUSE",
}
PINCH_STATUS = {
    "LEFT": "LEFT CLICK/DRAG", "RIGHT": "RIGHT CLICK",
    "DOUBLE": "DOUBLE CLICK", "MIDDLE": "MIDDLE CLICK",
}
PINCH_COLOR = {
    "LEFT": (0, 255, 0), "RIGHT": (0, 100, 255),
    "DOUBLE": (255, 0, 255), "MIDDLE": (255, 255, 0),
}
PINCH_INVOLVES = {"LEFT": "M", "RIGHT": "R", "DOUBLE": "I", "MIDDLE": "P"}
PINCH_JOINTS = {"LEFT": (12, 9), "RIGHT": (16, 13), "DOUBLE": (8, 5), "MIDDLE": (20, 17)}  # (tip, knuckle)

LEGEND = [
    ("MOVE", "Open palm: move cursor"),
    ("PRECISION", "Index only: slow, precise move"),
    ("CLUTCH", "Fist: freeze cursor"),
    ("LEFT CLICK/DRAG", "Thumb+middle: left click / drag"),
    ("RIGHT CLICK", "Thumb+ring: right click"),
    ("DOUBLE CLICK", "Thumb+index: double click"),
    ("MIDDLE CLICK", "Thumb+pinky: middle click"),
    ("SCROLL", "2 fingers up: scroll (hand up/down)"),
    ("ZOOM", "3 fingers up: zoom (hand up/down)"),
    ("VOLUME", "Thumbs up / down: volume"),
    ("PLAY/PAUSE", "Rock sign: play / pause"),
]


# ---------------- Helpers ----------------
def dist(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)


def finger_states(p):
    """Return which fingers are extended: keys T I M R P."""
    wrist = p[0]

    def ext(tip, pip):
        return dist(p[tip], wrist) > dist(p[pip], wrist) * 1.1

    return {
        "T": dist(p[4], p[5]) > dist(p[3], p[5]) * 1.2,
        "I": ext(8, 6),
        "M": ext(12, 10),
        "R": ext(16, 14),
        "P": ext(20, 18),
    }


def classify_pose(p, hs, fs):
    i, m, r, pk, t = fs["I"], fs["M"], fs["R"], fs["P"], fs["T"]
    if i and m and r and pk:
        return "OPEN"
    if i and m and r and not pk:
        return "ZOOM"
    if i and m and not r and not pk:
        return "SCROLL"
    if i and pk and not m and not r:
        return "ROCK"
    if i and not m and not r and not pk:
        return "POINT"
    if not (i or m or r or pk):
        if t:
            if p[4].y < p[5].y - 0.3 * hs:
                return "THUMB_UP"
            if p[4].y > p[5].y + 0.5 * hs:
                return "THUMB_DOWN"
        return "FIST"
    return "OTHER"


def draw_trail(img, pts, color, thick_max=6):
    pts = list(pts)
    for i in range(1, len(pts)):
        a = i / len(pts)
        c = tuple(int(v * a) for v in color)
        cv2.line(img, pts[i - 1], pts[i], c, max(1, int(thick_max * a)))


def build_panel(cursor, screen_trail, ripples, status, last_action, fingers,
                fps, control_on, hand_seen):
    panel = np.full((DISP_H, PANEL_W, 3), (25, 25, 30), np.uint8)
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(panel, "SCREEN VIEW", (15, 26), font, 0.65, (200, 200, 200), 2)

    # mini screen (aspect-correct, capped height)
    max_h = 200
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
        cv2.circle(panel, to_mini(rp["pos"]), int(8 + age * 60), col, 2)

    if hand_seen:
        cv2.circle(panel, to_mini(cursor), 7, (0, 255, 255), -1)
        cv2.circle(panel, to_mini(cursor), 11, (255, 255, 255), 1)

    # readouts
    y = oy + mh + 28
    cv2.putText(panel, f"Cursor: ({int(cursor[0])}, {int(cursor[1])})", (15, y),
                font, 0.55, (230, 230, 230), 1)
    y += 26
    cv2.putText(panel, f"Gesture: {status}", (15, y), font, 0.65, (0, 255, 120), 2)
    y += 24
    act_text, act_time = last_action
    if act_text and now - act_time < 1.5:
        cv2.putText(panel, f"Action: {act_text}", (15, y), font, 0.5,
                    (0, 200, 255), 1)
    y += 14
    for idx, name in enumerate("TIMRP"):
        x = 15 + idx * 34
        on = fingers[idx]
        cv2.rectangle(panel, (x, y), (x + 26, y + 22),
                      (0, 200, 90) if on else (55, 55, 60), -1)
        cv2.putText(panel, name, (x + 7, y + 16), font, 0.5,
                    (0, 0, 0) if on else (150, 150, 150), 1)
    mode = "MOUSE: ON" if control_on else "DEMO MODE (mouse off)"
    cv2.putText(panel, f"{mode}   {int(fps)} FPS", (200, y + 16), font, 0.45,
                (0, 200, 255) if control_on else (0, 140, 255), 1)

    # legend
    y += 52
    cv2.putText(panel, "GESTURES", (15, y), font, 0.5, (200, 200, 200), 1)
    y += 20
    for key, text in LEGEND:
        active = status.startswith(key)
        if active:
            cv2.rectangle(panel, (8, y - 13), (PANEL_W - 8, y + 4), (60, 90, 40), -1)
        cv2.putText(panel, text, (15, y), font, 0.42,
                    (255, 255, 255) if active else (150, 150, 160), 1)
        y += 17

    return panel


# ---------------- Main ----------------
def main():
    backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY  # faster webcam start on Windows
    cap = cv2.VideoCapture(CAM_INDEX, backend)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_H)
    if not cap.isOpened():
        raise RuntimeError("Could not open camera. Try changing CAM_INDEX.")

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

    control_on = True
    show_trail = True
    dragging = False
    pinch_name = None
    pinch_start = 0.0
    hand_prev_seen = False
    rock_latched = False
    last_action = ("", 0.0)
    last = {"RIGHT": 0.0, "DOUBLE": 0.0, "MIDDLE": 0.0, "volume": 0.0, "media": 0.0}
    scroll_prev_y = None
    scroll_acc = 0.0
    prev_time = time.time()

    def do(fn, *a, **k):
        if control_on:
            fn(*a, **k)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            ts_ms = max(int((time.time() - t0) * 1000), last_ts + 1)  # must strictly increase
            last_ts = ts_ms
            result = landmarker.detect_for_video(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts_ms)
            now = time.time()

            cv2.rectangle(frame, (FRAME_MARGIN, FRAME_MARGIN),
                          (w - FRAME_MARGIN, h - FRAME_MARGIN), (255, 0, 255), 2)

            status = "No hand"
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

                fs = finger_states(p)
                fingers = [fs[k] for k in "TIMRP"]

                # ---------- pinch detection (with hysteresis) ----------
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

                if pinch_name and ratios[pinch_name] < PINCH_RELEASE \
                        and finger_open(pinch_name) > CURL_HOLD:
                    active = pinch_name
                else:
                    active = None
                    # a finger curled into the palm touching the thumb is NOT a pinch
                    valid = {k: v for k, v in ratios.items() if finger_open(k) > CURL_PRESS}
                    if valid:
                        cand = min(valid, key=valid.get)
                        others = [k for k in "IMRP" if k != PINCH_INVOLVES[cand]]
                        # other fingers must not be balled up (stops fist false-triggers)
                        if valid[cand] < PINCH_PRESS and any(fs[k] for k in others):
                            active = cand

                if active != pinch_name:
                    if pinch_name == "LEFT":            # pinch released
                        if dragging:
                            do(pyautogui.mouseUp)
                            dragging = False
                            last_action = ("Drop", now)
                        else:
                            do(pyautogui.click)
                            last_action = ("Left click", now)
                            ripples.append({"t": now, "pos": (cursor_x, cursor_y),
                                            "color": PINCH_COLOR["LEFT"]})
                    pinch_name = active
                    pinch_start = now
                    if active in ("RIGHT", "DOUBLE", "MIDDLE") \
                            and now - last[active] > ACTION_COOLDOWN:
                        last[active] = now
                        if active == "RIGHT":
                            do(pyautogui.rightClick)
                            last_action = ("Right click", now)
                        elif active == "DOUBLE":
                            do(pyautogui.doubleClick)
                            last_action = ("Double click", now)
                        else:
                            do(pyautogui.middleClick)
                            last_action = ("Middle click", now)
                        ripples.append({"t": now, "pos": (cursor_x, cursor_y),
                                        "color": PINCH_COLOR[active]})

                if pinch_name == "LEFT" and not dragging \
                        and now - pinch_start > DRAG_HOLD_TIME:
                    do(pyautogui.mouseDown)
                    dragging = True
                    last_action = ("Drag start", now)
                    ripples.append({"t": now, "pos": (cursor_x, cursor_y),
                                    "color": PINCH_COLOR["LEFT"]})

                # ---------- pose detection (voted) ----------
                raw_pose = classify_pose(p, hs, fs)
                pose_hist.append(raw_pose)
                pose = Counter(pose_hist).most_common(1)[0][0]
                stable = (raw_pose == pose)   # only fire actions when voted + current frame agree

                # ---------- pose actions ----------
                if pinch_name is None:
                    if pose in ("SCROLL", "ZOOM"):
                        if scroll_prev_y is None:
                            scroll_prev_y = py
                        dy = scroll_prev_y - py
                        scroll_prev_y = py
                        if abs(dy) < 1.0:
                            dy = 0
                        scroll_acc += dy * SCROLL_GAIN
                        if abs(scroll_acc) >= 30 and stable:
                            amt = int(scroll_acc)
                            scroll_acc -= amt
                            if pose == "SCROLL":
                                do(pyautogui.scroll, amt)
                                last_action = ("Scroll " + ("UP" if amt > 0 else "DOWN"), now)
                            else:
                                if control_on:
                                    pyautogui.keyDown("ctrl")
                                    pyautogui.scroll(amt)
                                    pyautogui.keyUp("ctrl")
                                last_action = ("Zoom " + ("IN" if amt > 0 else "OUT"), now)
                    else:
                        scroll_prev_y = None
                        scroll_acc = 0.0

                    if pose in ("THUMB_UP", "THUMB_DOWN") and stable \
                            and now - last["volume"] > VOLUME_COOLDOWN:
                        last["volume"] = now
                        key = "volumeup" if pose == "THUMB_UP" else "volumedown"
                        do(pyautogui.press, key)
                        last_action = ("Volume " + ("+" if pose == "THUMB_UP" else "-"), now)

                    if pose != "ROCK":
                        rock_latched = False
                    elif stable and not rock_latched \
                            and now - last["media"] > MEDIA_COOLDOWN:
                        rock_latched = True   # one toggle per rock-sign hold
                        last["media"] = now
                        do(pyautogui.press, "playpause")
                        last_action = ("Play / Pause", now)
                else:
                    scroll_prev_y = None
                    scroll_acc = 0.0

                status = PINCH_STATUS[pinch_name] if pinch_name else POSE_STATUS[pose]

                # ---------- cursor movement ----------
                raw_x = float(np.interp(px, (FRAME_MARGIN, w - FRAME_MARGIN), (0, SCREEN_W)))
                raw_y = float(np.interp(py, (FRAME_MARGIN, h - FRAME_MARGIN), (0, SCREEN_H)))

                frozen = (not hand_prev_seen) \
                    or (pinch_name is not None and not dragging) \
                    or (pinch_name is None and pose in FREEZE_POSES)

                if frozen:
                    # keep cursor where it is; re-anchor so there is no jump on resume
                    offset_x = cursor_x - raw_x
                    offset_y = cursor_y - raw_y
                else:
                    # 5px margin so the hand can't accidentally trip PyAutoGUI's corner failsafe
                    tx = float(np.clip(raw_x + offset_x, 5, SCREEN_W - 6))
                    ty = float(np.clip(raw_y + offset_y, 5, SCREEN_H - 6))
                    s = PRECISION_SMOOTHING if (pinch_name is None and pose == "POINT") else SMOOTHING
                    cursor_x += (tx - cursor_x) / s
                    cursor_y += (ty - cursor_y) / s
                    do(pyautogui.moveTo, cursor_x, cursor_y)
                    screen_trail.append((cursor_x, cursor_y))

                # ---------- camera overlay ----------
                col = PINCH_COLOR[pinch_name] if pinch_name else (0, 255, 255)
                cv2.circle(frame, (int(px), int(py)), 10, (0, 255, 255), -1)
                if pinch_name or pose in FREEZE_POSES or pose == "POINT":
                    cv2.circle(frame, (int(px), int(py)), 24, col, 3)
            else:
                cam_trail.clear()
                pose_hist.clear()
                rock_latched = False
                scroll_prev_y = None
                scroll_acc = 0.0
                if dragging:
                    do(pyautogui.mouseUp)
                    dragging = False
                pinch_name = None

            hand_prev_seen = hand_seen

            if show_trail:
                draw_trail(frame, cam_trail, (0, 255, 255))

            cv2.putText(frame, status, (10, 32), cv2.FONT_HERSHEY_SIMPLEX,
                        0.9, (0, 255, 0), 2)

            fps = 1 / max(time.time() - prev_time, 1e-6)
            prev_time = time.time()

            view = cv2.resize(frame, (DISP_W, DISP_H))
            panel = build_panel((cursor_x, cursor_y),
                                screen_trail if show_trail else [],
                                ripples, status, last_action, fingers,
                                fps, control_on, hand_seen)
            cv2.imshow("Hand Mouse Showcase", np.hstack([view, panel]))

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("m"):
                control_on = not control_on
                if not control_on and dragging:
                    pyautogui.mouseUp()
                    dragging = False
            elif key == ord("t"):
                show_trail = not show_trail
            elif key == ord("r"):
                offset_x = offset_y = 0.0
    finally:
        if dragging:
            pyautogui.mouseUp()
        cap.release()
        cv2.destroyAllWindows()
        landmarker.close()


if __name__ == "__main__":
    main()
