async function checkVendor() {
  const r = await fetch('http://localhost:3009/vendor/three/build/three.module.js');
  console.log('Vendor Three status:', r.status, r.headers.get('content-type'));
}
checkVendor().catch(console.error);
