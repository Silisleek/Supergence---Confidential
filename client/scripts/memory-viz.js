// SIS 1.0 — Cognitive Knowledge Graph & Memory Visualizer
// Dynamic interactive canvas visualization of the hierarchical memory tree and associative knowledge graph

export class MemoryVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = null;
    this.nodes = [];
    this.graphEdges = [];
    this.hoveredNode = null;
    this.offset = { x: 0, y: 0 };
    this.scale = 1;
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.pulsePhase = 0;

    // Strict Tactical Palette
    this.colors = {
      root: '#C89B68',
      category: '#2563EB',
      text: '#84CC16',
      analysis: '#60A5FA',
      user: '#8B5E3C',
      assistant: '#84CC16',
      'autonomous-breakthrough': '#A855F7',
      'operational-heuristic': '#00F0FF',
      skill: '#F59E0B',
      verified: '#10B981',
      default: '#94A3B8',
      line: 'rgba(37, 99, 235, 0.4)',
      graphEdge: 'rgba(168, 85, 247, 0.35)',
      hover: '#FFFFFF',
      bg: '#080B10',
      label: '#94A3B8',
    };

    this._resize();
    this._initEvents();
    this._animate();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      const w = Math.floor(rect.width || 600);
      const h = Math.floor(rect.height || 380);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }
  }

  _initEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - this.offset.x) / this.scale;
      const my = (e.clientY - rect.top - this.offset.y) / this.scale;

      if (this.isDragging) {
        this.offset.x += e.clientX - this.lastMouse.x;
        this.offset.y += e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        return;
      }

      this.hoveredNode = null;
      for (const node of this.nodes) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < (node.radius + 6) * (node.radius + 6)) {
          this.hoveredNode = node;
          this.canvas.style.cursor = 'pointer';
          break;
        }
      }
      if (!this.hoveredNode) this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.max(0.25, Math.min(3, this.scale * delta));
    });

    window.addEventListener('resize', () => {
      this._resize();
      if (this.data) this.setData(this.data);
    });
  }

  render(data) {
    this.setData(data);
  }

  setData(data) {
    this._resize();
    this.data = data;
    this.nodes = [];
    this.offset = { x: 0, y: 0 };
    this.scale = 1;

    if (data) {
      const rootX = Math.max(200, this.canvas.width / 2);
      this._layoutTree(data, rootX, 40, 0);
    }
  }

  _layoutTree(node, x, y, depth) {
    if (!node) return;
    const radius = depth === 0 ? 14 : Math.max(5, 12 - depth * 1.5);
    const color =
      this.colors[node.type] || (depth === 1 ? this.colors.category : this.colors.default);

    const vizNode = {
      id: node.id,
      x,
      y,
      radius,
      color,
      depth,
      label: (node.content || node.id || '').substring(0, 26),
      type: node.type || 'node',
      couldBeWrong: node.couldBeWrong,
      confidence: node.confidence,
      children: [],
    };
    this.nodes.push(vizNode);

    if (node.children && node.children.length > 0) {
      const count = node.children.length;
      const spacing = Math.max(35, 180 / Math.pow(1.3, depth));
      const totalWidth = (count - 1) * spacing;
      const startX = x - totalWidth / 2;

      node.children.forEach((child, i) => {
        const cx = startX + i * spacing;
        const cy = y + 65 + depth * 4;
        vizNode.children.push({ x: cx, y: cy });
        this._layoutTree(child, cx, cy, depth + 1);
      });
    }

    return vizNode;
  }

  _animate() {
    this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);
    this._draw();
    requestAnimationFrame(() => this._animate());
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.scale(this.scale, this.scale);

    // Draw connecting neural branches
    for (const node of this.nodes) {
      for (const child of node.children) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(child.x, child.y);
        ctx.strokeStyle = this.colors.line;
        ctx.lineWidth = Math.max(1, 2 - node.depth * 0.4);
        ctx.stroke();
      }
    }

    // Draw memory nodes
    for (const node of this.nodes) {
      const isBreakthrough = node.type === 'autonomous-breakthrough';
      const isHovered = node === this.hoveredNode;

      // Pulsing halo for autonomous breakthroughs
      if (isBreakthrough) {
        const pulseR = node.radius + 4 + Math.sin(this.pulsePhase) * 2.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? this.colors.hover : node.color;
      ctx.fill();

      // Border indicator
      ctx.strokeStyle = isHovered ? '#FFFFFF' : 'rgba(37, 99, 235, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (node.couldBeWrong) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Render static label for top levels or on hover
      if (node.depth <= 1 || isHovered || isBreakthrough) {
        ctx.fillStyle = isHovered ? '#FFFFFF' : this.colors.label;
        ctx.font = isHovered ? 'bold 11px JetBrains Mono' : '10px JetBrains Mono';
        ctx.textAlign = 'center';
        const labelY = node.y + node.radius + 12;
        ctx.fillText(node.label, node.x, labelY);

        if (isHovered) {
          ctx.fillStyle = isBreakthrough ? '#A855F7' : '#60A5FA';
          ctx.font = '9px JetBrains Mono';
          ctx.fillText(
            `[${node.type}] conf:${(node.confidence || 1).toFixed(2)}`,
            node.x,
            labelY + 12,
          );
        }
      }
    }

    ctx.restore();

    // HUD Telemetry overlay
    ctx.fillStyle = '#64748B';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `KNOWLEDGE GRAPH // NODES: ${this.nodes.length} · SCALE: ${(this.scale * 100).toFixed(0)}%`,
      12,
      h - 12,
    );

    if (this.nodes.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COGNITIVE GRAPH STANDBY // HYBRID EMBEDDINGS ACTIVE', w / 2, h / 2);
    }
  }
}

export default MemoryVisualizer;
