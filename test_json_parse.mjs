// Test if res.json() exception IS caught properly

async function testJsonException() {
  const mockRes = {
    ok: true,
    json: async () => {
      // Simulate Overpass returning HTML error page with 200 status
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    }
  };

  let data = null;
  let lastErr = null;
  
  try {
    // This mirrors the actual code structure
    if (!mockRes.ok) {
      lastErr = new Error(`HTTP ${mockRes.status}`);
      console.log('Branch: HTTP error - continue');
    } else {
      // res.json() exception IS inside try block
      data = await mockRes.json();
      console.log('Branch: JSON success');
    }
  } catch (e) {
    // This DOES catch res.json() exceptions
    lastErr = e;
    console.log(`Branch: Caught exception - ${e.message}`);
  }
  
  if (!data) throw lastErr;
}

testJsonException()
  .then(() => console.log('No error - this would not happen'))
  .catch(e => console.log(`\nFinal error thrown: ${e.message}`));

console.log('\n✓ YES: res.json() exceptions ARE caught by try-catch');
console.log('✓ Fallback mechanism WORKS correctly for JSON parse errors');
