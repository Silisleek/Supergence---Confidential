# 07. Developer & Agent Token Optimization Guide

This guide defines the official token optimization protocol for engineers and autonomous AI agents working within the SIS 1.0 repository to maximize efficiency under quota-constrained environments (such as Google AI Pro plans).

---

## 1. Golden Rules for AI Agents

### Rule 1: Read `brain.md` First

- **Problem**: In fresh conversations, agents often run massive recursive file searches and view dozens of code files, consuming 50,000–100,000 tokens before writing a single line of code.
- **Protocol**: **Always read `brain.md` at the workspace root first.** It contains a consolidated high-density index of ports, entrypoints, state variables, and design rules in ~1,500 tokens.

### Rule 2: Precision Line Slicing (`view_file`)

- **Problem**: Reading large files like `main.css` (6,800+ lines) or `app.js` (4,900+ lines) in full can consume 80,000+ tokens in one tool call.
- **Protocol**:
  - Always use `grep_search` on specific directories first to pinpoint line numbers.
  - Use `view_file` with precise `StartLine` and `EndLine` slices (e.g., lines 120–170). Never omit both parameters on files larger than 200 lines.

### Rule 3: Targeted Single-Contiguous Edits (`replace_file_content`)

- **Problem**: Overwriting entire multi-thousand line files with `write_to_file` wastes massive output token bandwidth and introduces regression risks.
- **Protocol**: Always use `replace_file_content` targeting the specific block of lines that requires modification.

### Rule 4: Zero-Redundancy Chat Responses

- **Problem**: Re-pasting entire updated code files or re-summarizing artifact documents in chat responses wastes thousands of completion tokens.
- **Protocol**:
  - State what changed concisely in bullet points.
  - Point the user to the modified file link (`file:///path/to/file#L10-L40`) or artifact.

---

## 2. Fast Verification Cheatsheet (Minimal Token Footprint)

```powershell
# 1. Check if backend (:3008) and frontend (:5173) are listening
netstat -ano | findstr "5173 3008"

# 2. Verify Vite production build compiles without errors
npx vite build

# 3. Test HTTP & WebSocket responsiveness via 1-line script
node -e "const http = require('http'); http.get('http://localhost:5173/', res => console.log('Vite status:', res.statusCode)); http.get('http://localhost:3008/api/parts', res => console.log('API status:', res.statusCode));"

# 4. Capture automated headless screenshot of live UI
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--headless=new", "--user-data-dir=`"$env:TEMP\chrome_headless_profile`"", "--screenshot=`"c:\Users\Akshan sharma\Desktop\SIS1.0\screenshot.png`"", "--window-size=1920,1080", "--virtual-time-budget=6000", "http://localhost:5173/" -Wait
```
