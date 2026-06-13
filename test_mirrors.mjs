// Test which Overpass mirrors are actually reachable and their response times
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function checkMirrors() {
  for (const url of ENDPOINTS) {
    try {
      console.log(`Checking ${url}...`);
      const startTime = Date.now();
      
      const query = '[out:json][timeout:5];(nwr["leisure"="playground"](around:1000,52.37,4.9););out center tags 10;';
      
      const res = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        )
      ]);
      
      const elapsed = Date.now() - startTime;
      
      if (!res.ok) {
        console.log(`  Status: ${res.status} (${elapsed}ms)`);
      } else {
        const data = await res.json();
        const count = data.elements?.length ?? 0;
        console.log(`  OK: ${count} elements (${elapsed}ms)`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }
}

checkMirrors();
