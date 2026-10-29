export function injectImportmapIfNeeded(html) {
  if (!/from\s+['"]three['"]|three(?:\.module\.js|@|\/build\/three|\/examples\/jsm|\/addons)|OrbitControls|GLTFLoader|FontLoader|EffectComposer|UnrealBloomPass|\bTHREE\b/i.test(html)) return html;
  const pattern=/<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/i;
  const match=html.match(pattern);
  let mapping={};
  if(match){try{mapping=JSON.parse(match[1]);}catch{return html;}}
  const imports=mapping.imports||{};
  // Respect explicit project versions. New local projects share the installed
  // core with their addons instead of mixing incompatible Three.js revisions.
  const base=typeof imports.three==='string'&&imports.three.endsWith('/build/three.module.js')
    ?imports.three.slice(0,-'/build/three.module.js'.length):'/vendor/three';
  mapping.imports={
    three:`${base}/build/three.module.js`,
    'three/addons/':`${base}/examples/jsm/`,
    'three/examples/jsm/':`${base}/examples/jsm/`,
    'cannon-es':'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',
    ...imports,
  };
  const script=`<script type="importmap">\n${JSON.stringify(mapping,null,2)}\n</script>`;
  if(match)return html.replace(pattern,()=>script);
  if(/<head\b[^>]*>/i.test(html))return html.replace(/<head\b[^>]*>/i,head=>head+'\n'+script);
  return html.replace(/<script\b/i,script+'\n<script');
}
