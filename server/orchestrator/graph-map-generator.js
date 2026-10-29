// SIS 1.0 — Graph and Map Generator Engine
// Pillar 10: Interactive Mermaid charts, D3 force knowledge graphs, Leaflet geographic maps, and 3D coordinate topology

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import workspace from '../workspace/manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR
  ? path.resolve(process.env.SIS_WORKSPACE_DIR)
  : path.resolve(__dirname, '../../workspace');

export class GraphMapGenerator {
  constructor() {
    if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }

  /**
   * Unified generator dispatcher
   */
  async generate({ type, data, title, filename }) {
    const cleanType = String(type || 'mermaid').toLowerCase();
    const safeTitle = title || 'SIS Visual Graph';

    switch (cleanType) {
      case 'mermaid':
      case 'flowchart':
      case 'sequence':
      case 'mindmap':
      case 'er':
        return this.generateMermaidPage({ code: data, title: safeTitle, filename });

      case 'd3':
      case 'knowledge-graph':
      case 'network':
        return this.generateD3KnowledgeGraph({
          nodes: data?.nodes || [],
          links: data?.links || [],
          title: safeTitle,
          filename,
        });

      case 'map':
      case 'leaflet':
      case 'geographic':
        return this.generateLeafletMap({
          markers: data?.markers || [],
          center: data?.center || [37.7749, -122.4194],
          zoom: data?.zoom || 12,
          title: safeTitle,
          filename,
        });

      default:
        return this.generateMermaidPage({ code: data, title: safeTitle, filename });
    }
  }

  /**
   * Generate standalone interactive HTML page for Mermaid diagrams
   */
  generateMermaidPage({ code, title = 'Mermaid Graph', filename = null }) {
    const fn = filename || `graph_${Date.now()}.html`;
    const targetPath = path.join(WORKSPACE_DIR, fn);

    const cleanCode = String(
      code || `graph TD\n  A["Start"] --> B["Processing"]\n  B --> C["Verified Output"]`,
    ).trim();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} // SIS Visualizer</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #080B10;
      color: #E2E8F0;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .header {
      width: 100%;
      max-width: 960px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 240, 255, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title { color: #00F0FF; font-size: 14px; font-weight: 700; letter-spacing: 1px; }
    .status { font-size: 11px; color: #00FF88; }
    .graph-container {
      background: rgba(8, 16, 36, 0.95);
      border: 1px solid rgba(0, 240, 255, 0.4);
      border-radius: 6px;
      padding: 32px;
      width: 100%;
      max-width: 960px;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.15);
      display: flex;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="title">⚡ ${title.toUpperCase()}</span>
    <span class="status">[ ACTIVE // MERMAID 10 ]</span>
  </div>
  <div class="graph-container">
    <pre class="mermaid">
${cleanCode}
    </pre>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#081024',
        primaryColor: '#00F0FF',
        primaryTextColor: '#FFFFFF',
        primaryBorderColor: '#00F0FF',
        lineColor: '#00F0FF',
        secondaryColor: '#A855F7',
        tertiaryColor: '#F59E0B'
      }
    });
  </script>
</body>
</html>`;

    fs.writeFileSync(targetPath, html, 'utf8');
    return {
      success: true,
      filename: fn,
      filepath: targetPath,
      url: `/workspace/${fn}`,
      type: 'mermaid',
    };
  }

  /**
   * Generate interactive D3.js Force-Directed Knowledge Graph
   */
  generateD3KnowledgeGraph({
    nodes = [],
    links = [],
    title = 'Knowledge Network',
    filename = null,
  }) {
    const fn = filename || `network_${Date.now()}.html`;
    const targetPath = path.join(WORKSPACE_DIR, fn);

    const defaultNodes =
      nodes.length > 0
        ? nodes
        : [
            { id: 'SIS Core', group: 1, size: 24 },
            { id: 'Conscious Stream', group: 2, size: 16 },
            { id: 'Subconscious Matrix', group: 2, size: 16 },
            { id: 'Pattern Recognition', group: 3, size: 12 },
            { id: 'Math Experts', group: 3, size: 12 },
            { id: 'Coding Experts', group: 3, size: 12 },
            { id: 'Deep Research', group: 3, size: 12 },
            { id: 'Universal Interpreter', group: 3, size: 12 },
            { id: 'Observers', group: 3, size: 12 },
          ];

    const defaultLinks =
      links.length > 0
        ? links
        : [
            { source: 'SIS Core', target: 'Conscious Stream' },
            { source: 'SIS Core', target: 'Subconscious Matrix' },
            { source: 'Subconscious Matrix', target: 'Pattern Recognition' },
            { source: 'Subconscious Matrix', target: 'Math Experts' },
            { source: 'Subconscious Matrix', target: 'Coding Experts' },
            { source: 'Subconscious Matrix', target: 'Deep Research' },
            { source: 'Subconscious Matrix', target: 'Universal Interpreter' },
            { source: 'Subconscious Matrix', target: 'Observers' },
          ];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} // D3 Network Graph</title>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <style>
    body { margin: 0; background: #080B10; overflow: hidden; font-family: monospace; }
    #hud { position: absolute; top: 16px; left: 16px; color: #00F0FF; z-index: 10; font-size: 12px; pointer-events: none; }
    svg { width: 100vw; height: 100vh; }
    .link { stroke: rgba(0, 240, 255, 0.4); stroke-width: 1.5px; }
    .node circle { stroke: #00F0FF; stroke-width: 2px; cursor: grab; }
    .node text { fill: #E2E8F0; font-size: 11px; font-weight: bold; pointer-events: none; text-shadow: 0 0 6px #000; }
  </style>
</head>
<body>
  <div id="hud">⚡ ${title.toUpperCase()} // D3 FORCE NETWORK GRAPH [DRAG NODES / ZOOM]</div>
  <svg id="canvas"></svg>
  <script>
    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select("#canvas")
      .call(d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)));
    const g = svg.append("g");

    const nodes = ${JSON.stringify(defaultNodes)};
    const links = ${JSON.stringify(defaultLinks)};

    const colors = ['#00F0FF', '#00FF88', '#A855F7', '#F59E0B', '#3B82F6'];

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g").selectAll(".link")
      .data(links).enter().append("line").attr("class", "link");

    const node = g.append("g").selectAll(".node")
      .data(nodes).enter().append("g").attr("class", "node")
      .call(d3.drag()
        .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append("circle")
      .attr("r", d => d.size || 14)
      .attr("fill", d => colors[(d.group || 1) % colors.length])
      .style("filter", "drop-shadow(0 0 8px rgba(0,240,255,0.7))");

    node.append("text").attr("dx", 16).attr("dy", 4).text(d => d.id);

    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
    });
  </script>
</body>
</html>`;

    fs.writeFileSync(targetPath, html, 'utf8');
    return {
      success: true,
      filename: fn,
      filepath: targetPath,
      url: `/workspace/${fn}`,
      type: 'd3-graph',
    };
  }

  /**
   * Generate interactive Leaflet.js Geographic Map
   */
  generateLeafletMap({
    markers = [],
    center = [37.7749, -122.4194],
    zoom = 12,
    title = 'Geographic Map',
    filename = null,
  }) {
    const fn = filename || `map_${Date.now()}.html`;
    const targetPath = path.join(WORKSPACE_DIR, fn);

    const defaultMarkers =
      markers.length > 0
        ? markers
        : [
            {
              lat: center[0],
              lng: center[1],
              label: 'Primary Geolocation Anchor',
              popup: 'Primary Node Coordinates',
            },
          ];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} // Interactive Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background: #080B10; font-family: monospace; overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
    #hud {
      position: absolute; top: 16px; left: 60px; z-index: 1000;
      background: rgba(8, 16, 36, 0.9); border: 1px solid #00F0FF;
      color: #00F0FF; padding: 8px 16px; border-radius: 4px;
      font-size: 11px; letter-spacing: 1px; box-shadow: 0 0 16px rgba(0,240,255,0.4);
    }
    .leaflet-popup-content-wrapper {
      background: rgba(8, 16, 36, 0.95); color: #FFF;
      border: 1px solid #00F0FF; border-radius: 4px; font-family: monospace;
    }
  </style>
</head>
<body>
  <div id="hud">🌐 ${title.toUpperCase()} // TACTICAL GIS [LAT: ${center[0]}, LNG: ${center[1]}]</div>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${center[0]}, ${center[1]}], ${zoom});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    const markers = ${JSON.stringify(defaultMarkers)};
    markers.forEach(m => {
      const circle = L.circleMarker([m.lat, m.lng], {
        color: '#00F0FF',
        fillColor: '#00FF88',
        fillOpacity: 0.8,
        radius: 8
      }).addTo(map);
      if (m.popup || m.label) {
        circle.bindPopup('<b>' + (m.label || 'Node') + '</b><br>' + (m.popup || ''));
      }
    });
  </script>
</body>
</html>`;

    fs.writeFileSync(targetPath, html, 'utf8');
    return {
      success: true,
      filename: fn,
      filepath: targetPath,
      url: `/workspace/${fn}`,
      type: 'leaflet-map',
    };
  }
}

const graphMapGenerator = new GraphMapGenerator();
export default graphMapGenerator;
