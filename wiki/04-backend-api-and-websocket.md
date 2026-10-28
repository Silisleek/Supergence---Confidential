# 04. Backend API & WebSocket Architecture

The SIS 1.0 backend is powered by Node.js, Express, and a high-performance native WebSocket server (`server/index.js`), acting as the nervous system connecting the conscious streamer, subconscious matrix, and frontend cockpit.

---

## 1. WebSocket Duplex Streaming Protocol (`ws://localhost:3008`)

The WebSocket connection handles low-latency, bidirectional token streaming, intermediate cognitive thought broadcasts, and live telemetry updates.

### Inbound Messages (Client $\to$ Server)

```json
// User prompt transmission
{
  "type": "message",
  "content": "Design an interactive procedural 3D simulation with Three.js",
  "conversationId": "3f12a8b9-4d2c-4e5a-9a67-123456789abc"
}

// User stream interruption / cancellation
{
  "type": "interrupt"
}
```

### Outbound Broadcast Messages (Server $\to$ Client)

```json
// 1. Real-time conscious stream chunk
{
  "type": "stream_chunk",
  "chunk": "Synthesizing dynamic WebGL kinematics...",
  "conversationId": "3f12a8b9-..."
}

// 2. Stream completion signal
{
  "type": "stream_end",
  "response": "Full synthesized solution",
  "metadata": {
    "latencyMs": 842,
    "tokens": 468,
    "partsConsulted": 25
  }
}

// 3. Subconscious 25-part state updates
{
  "type": "parts_status",
  "activeCount": 25,
  "parts": [
    { "id": "logician", "status": "evaluating", "confidence": 0.98 },
    { "id": "algorithm", "status": "optimizing", "confidence": 0.95 }
  ]
}

// 4. POSSAP Anticipatory Prediction
{
  "type": "possap_prediction",
  "predictedPrompt": "Request procedural 3D visual simulation...",
  "confidence": 0.942,
  "preparednessScore": 0.88
}

// 5. RSI Evolutionary Event
{
  "type": "rsi_event",
  "strand": "RQGM",
  "epoch": 4,
  "gain": "+3.4% accuracy",
  "status": "invariants_verified"
}
```

---

## 2. REST API Endpoints (`/api`)

### Conversations (`/api/conversations`)

- `GET /api/conversations`: Retrieves index of saved mission conversation sessions.
- `POST /api/conversations`: Creates a new active conversation session.
- `GET /api/conversations/:id`: Fetches complete message history and metadata for a specific session.
- `DELETE /api/conversations/:id`: Purges a conversation from disk.

### Multi-SIS Systems (`/api/systems`)

- `GET /api/systems`: Lists all configured SIS environments.
- `POST /api/systems`: Provisions a new isolated zero-data SIS instance with custom system prompts.
- `POST /api/systems/:id/activate`: Switches global context to the specified system.

### Subconscious Matrix (`/api/parts`)

- `GET /api/parts`: Returns full metadata, domain specializations, and health metrics for all 25 subconscious heuristic models.

### Memory & Knowledge (`/api/memory`)

- `GET /api/memory/tree`: Serialized hierarchical episodic and semantic tree for D3.js visualizer.
- `GET /api/memory/search?q=:query`: Semantic lookup across verified long-term memory nodes.

### Workspace & Sandboxing (`/api/workspace`)

- `GET /api/workspace/tree`: File and directory hierarchy of generated artifacts.
- `GET /api/workspace/file?path=:path`: Reads file content.
- `POST /api/workspace/file`: Creates or modifies code files.

### Recursive Self-Improvement (`/api/improvement`)

- `POST /api/improvement/rsi/trigger`: Manually triggers concurrent evaluation across all 4 RSI strands (`RQGM`, `AZR`, `AlphaEvolve`, `SEAL`).
- `GET /api/improvement/clades`: Fetches phylogenetic lineage archive of evolved cognitive traits.

---

## 3. Resilience & Crash Protection

The server employs global safety handlers in `server/index.js`:

```javascript
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception intercepted:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled rejection intercepted:', reason);
});
```

This guarantees that unhandled API timeout rejections or malformed WebSockets cannot terminate the background Node.js process.
