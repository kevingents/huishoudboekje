// Simulate the overpass fetch logic to identify JSON.parse issue
async function testFallbackLogic() {
  const ENDPOINTS = [
    'https://example1.com',
    'https://example2.com', 
    'https://example3.com'
  ];

  let data = null;
  let lastErr = null;
  
  // Simulating: First endpoint returns 200 but invalid JSON
  for (const url of ENDPOINTS) {
    try {
      console.log(`Trying ${url}...`);
      // Simulate res.ok = true
      const res = {
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        }
      };
      
      if (!res.ok) {
        lastErr = new Error(`Overpass ${res.status}`);
        console.log('  -> HTTP error, continuing');
        continue;
      }
      
      // CRITICAL: This line is NOT inside try-catch!
      // If it throws, the exception propagates UP
      data = await res.json();
      console.log('  -> Success');
      break;
    } catch (e) {
      console.log(`  -> Caught exception: ${e.message}`);
      lastErr = e;
      // continue to next mirror
    }
  }
  
  if (!data) throw lastErr ?? new Error('All mirrors failed');
}

testFallbackLogic().catch(e => {
  console.error(`\nFINAL ERROR: ${e.message}`);
  console.error('This error breaks the fallback chain!');
});
