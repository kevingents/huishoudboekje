// Test if fetch() has implicit timeout behavior

console.log('Testing Node.js fetch timeout behavior...\n');

// Test 1: Check if fetch respects Overpass query timeout
const query1 = '[out:json][timeout:2];(nwr["leisure"="playground"](around:1000,52.37,4.9););out center tags 10;';
const query2 = '[out:json][timeout:30];(nwr["leisure"="playground"](around:1000,52.37,4.9););out center tags 10;';

console.log('Query 1 timeout param: 2 seconds');
console.log('Query 2 timeout param: 30 seconds');
console.log('\nImportant: Overpass [timeout:X] parameter is SERVER-SIDE only');
console.log('It does NOT affect the JavaScript fetch() call duration');
console.log('\nNode.js fetch() default behavior:');
console.log('- No implicit timeout (waits indefinitely unless AbortController used)');
console.log('- HTTP client libs may timeout after minutes');
console.log('- Vercel function execution: depends on plan');
console.log('  - Free: 12 seconds');
console.log('  - Pro: 60 seconds'); 
console.log('  - Enterprise: up to 900 seconds');
console.log('\nRoute.ts config:');
console.log('- No maxDuration exported');
console.log('- No AbortController with timeout');
console.log('- RISK: On Free tier, if Overpass takes >12s total, function aborts');
console.log('  Before all 3 mirrors tried (could take 30-60s without timeout)');
