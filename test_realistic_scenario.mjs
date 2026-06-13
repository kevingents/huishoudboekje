// Realistic test: Mirrors fail, function needs to timeout gracefully

async function findNearbyRealworld() {
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];
  
  let data = null;
  let lastErr = null;
  const timeouts = [];
  
  for (const url of ENDPOINTS) {
    const start = Date.now();
    try {
      console.log(`Trying ${url.split('/')[2]}...`);
      
      // Simulate: Overpass returns rate limit (429)
      const res = {
        ok: false,
        status: 429,
      };
      
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status}`);
        const elapsed = Date.now() - start;
        timeouts.push(elapsed);
        console.log(`  HTTP ${res.status} (${elapsed}ms) - continue`);
        continue;
      }
      
      data = await res.json();
      break;
    } catch (e) {
      lastErr = e;
      const elapsed = Date.now() - start;
      timeouts.push(elapsed);
      console.log(`  Exception: ${e.message} (${elapsed}ms)`);
    }
  }
  
  const totalTime = timeouts.reduce((a, b) => a + b, 0);
  console.log(`\nTotal time for all mirrors: ${totalTime}ms`);
  console.log(`Average per mirror: ${Math.round(totalTime / timeouts.length)}ms`);
  
  if (!data) {
    console.log('\nAll mirrors failed. Error:', lastErr.message);
    console.log('API returns 502');
  }
}

findNearbyRealworld();

console.log('\n---');
console.log('KEY ISSUE: When Overpass mirrors are rate-limited (429):');
console.log('- Each mirror attempt is super fast (no network delay)');
console.log('- But user still sees timeout if Vercel default is lower');
console.log('- On Vercel Free: 12 second timeout');
console.log('- If each mirror takes 1-2 seconds to attempt:');
console.log('  - 3 mirrors × 2s = 6 seconds total');
console.log('  - Still under 12s, so this works');
console.log('\nWORSE CASE: Slow network + Overpass hanging');
console.log('- If first mirror hangs (no response) for 10 seconds');
console.log('- Second mirror never tried');
console.log('- Function times out at 12s on Free tier');
console.log('- ERROR: No exponential backoff or request timeout');
