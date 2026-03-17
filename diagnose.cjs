const http = require('http');
function get(path) {
  return new Promise((res, rej) => {
    http.get('http://localhost:3000' + path, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(new Error(path + ': ' + e.message + '\n' + d.slice(0,200))); } });
    }).on('error', rej);
  });
}
function normName(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

(async () => {
  const [tr, ro, ctr, cro] = await Promise.all([
    get('/api/trains'),
    get('/api/routes'),
    get('/api/commuter/trains').catch(() => ({ trains: [] })),
    get('/api/commuter/routes').catch(() => ({ routes: [] })),
  ]);
  const allTrains = [...(tr.trains || []), ...(ctr.trains || [])];
  const allRoutes = [...(ro.routes || []), ...(cro.routes || [])];
  const withPos = allTrains.filter(t => t.lat != null && t.lon != null && t.lat !== 0 && t.lon !== 0);

  console.log('=== TRAINS ===');
  console.log('Total:', allTrains.length, ' With position:', withPos.length);
  withPos.slice(0, 8).forEach(t => {
    console.log(` src:${t.source} route:${JSON.stringify(t.route)} name:${JSON.stringify(t.name)} [${t.lat},${t.lon}]`);
  });

  console.log('\n=== ROUTES ===');
  console.log('Total:', allRoutes.length);
  const routesBySource = new Map();
  allRoutes.forEach(r => {
    if (!routesBySource.has(r.source)) routesBySource.set(r.source, new Set());
    routesBySource.get(r.source).add(normName(r.name));
  });
  allRoutes.slice(0, 6).forEach(r => {
    const geo = r.geometry;
    const fc = geo && geo.type === 'LineString' ? geo.coordinates[0]
      : geo && geo.type === 'MultiLineString' ? geo.coordinates[0][0] : null;
    console.log(` src:${r.source} name:${JSON.stringify(r.name)} geo:${geo&&geo.type} first:${JSON.stringify(fc)}`);
  });

  console.log('\n=== SNAP VIABILITY ===');
  let snapOk = 0, noRoute = 0, noNameMatch = 0;
  withPos.forEach(t => {
    const srcNames = routesBySource.get(t.source);
    if (!srcNames || srcNames.size === 0) { noRoute++; return; }
    const tName = normName(t.route || t.name);
    if (srcNames.has(tName)) snapOk++;
    else noNameMatch++;
  });
  console.log(' Name match (named snap will work):', snapOk);
  console.log(' No name match (falls to source fallback):', noNameMatch);
  console.log(' No routes for source (no snap at all):', noRoute);

  console.log('\n=== NAME MISMATCHES BY SOURCE ===');
  const sources = [...new Set(withPos.map(t => t.source))];
  sources.forEach(src => {
    const srcTrains = withPos.filter(t => t.source === src);
    const srcNames = routesBySource.get(src) || new Set();
    const unmatched = [...new Set(srcTrains.map(t => normName(t.route || t.name)).filter(n => n && !srcNames.has(n)))];
    if (unmatched.length) {
      console.log('\n  ' + src + ' unmatched train names (' + unmatched.length + ' unique):');
      unmatched.slice(0, 5).forEach(n => console.log('    train: "' + n + '"'));
      console.log('  ' + src + ' route names (first 5):');
      [...srcNames].slice(0, 5).forEach(n => console.log('    route: "' + n + '"'));
    }
  });

  console.log('\n=== COORD SANITY ===');
  const outOfNA = withPos.filter(t => {
    const lat = Number(t.lat), lon = Number(t.lon);
    return lon < -170 || lon > -40 || lat < 10 || lat > 85;
  });
  console.log(' Outside NA box:', outOfNA.length);
  outOfNA.slice(0, 5).forEach(t => console.log('  ' + t.source + ' ' + t.name + ': [' + t.lat + ',' + t.lon + ']'));
})().catch(console.error);

function normName(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

(async () => {
  const [trains, routes, cTrains, cRoutes] = await Promise.all([
    get('/api/trains'),
    get('/api/routes'),
    get('/api/commuter/trains').catch(() => []),
    get('/api/commuter/routes').catch(() => []),
  ]);

  const allTrains = [...trains, ...cTrains];
  const allRoutes = [...routes, ...cRoutes];
  const withPos = allTrains.filter(t => t.lat != null && t.lon != null);

  console.log('=== TRAINS ===');
  console.log('Total:', allTrains.length, '  With position:', withPos.length);
  withPos.slice(0, 6).forEach(t => {
    console.log(' src:', t.source, ' route:', JSON.stringify(t.route), ' name:', JSON.stringify(t.name), ' lat:', t.lat, ' lon:', t.lon);
  });

  console.log('\n=== ROUTES ===');
  console.log('Total:', allRoutes.length);
  allRoutes.slice(0, 5).forEach(r => {
    const geo = r.geometry;
    const first = geo && geo.type === 'LineString'
      ? geo.coordinates[0]
      : geo && geo.type === 'MultiLineString'
        ? geo.coordinates[0][0]
        : null;
    console.log(' src:', r.source, ' name:', JSON.stringify(r.name), ' geo:', geo && geo.type, ' first:', JSON.stringify(first));
  });

  // Build route name set per source
  const routesBySource = new Map();
  allRoutes.forEach(r => {
    const key = r.source;
    if (!routesBySource.has(key)) routesBySource.set(key, []);
    routesBySource.get(key).push(normName(r.name));
  });

  // Check snap viability
  let snapOk = 0, noRoute = 0, noNameMatch = 0;
  withPos.forEach(t => {
    const srcRoutes = routesBySource.get(t.source) || [];
    if (srcRoutes.length === 0) { noRoute++; return; }
    const tName = normName(t.route || t.name);
    if (srcRoutes.includes(tName)) { snapOk++; }
    else { noNameMatch++; }
  });
  console.log('\n=== SNAP VIABILITY ===');
  console.log('Source has routes + name matches:', snapOk);
  console.log('Source has routes but NO name match:', noNameMatch);
  console.log('Source has NO routes at all:', noRoute);

  // Show mismatched names for biggest source
  const sources = [...new Set(withPos.map(t => t.source))];
  sources.forEach(src => {
    const srcTrains = withPos.filter(t => t.source === src);
    const srcRouteNames = new Set(routesBySource.get(src) || []);
    const unmatchedTrainNames = [...new Set(srcTrains.map(t => normName(t.route || t.name)).filter(n => n && !srcRouteNames.has(n)))];
    if (unmatchedTrainNames.length > 0) {
      console.log('\n  Source', src, '- unmatched train names:', unmatchedTrainNames.slice(0, 5));
      console.log('  Source', src, '- available route names:', [...srcRouteNames].slice(0, 5));
    }
  });

  // Check train coords validity
  const badLat = withPos.filter(t => Math.abs(Number(t.lat)) > 90);
  const badLon = withPos.filter(t => Math.abs(Number(t.lon)) > 180);
  const outOfNA = withPos.filter(t => {
    const lat = Number(t.lat), lon = Number(t.lon);
    return lon < -170 || lon > -40 || lat < 10 || lat > 85;
  });
  console.log('\n=== COORD SANITY ===');
  console.log('Bad lat (>90):', badLat.length);
  console.log('Bad lon (>180):', badLon.length);
  console.log('Outside NA box:', outOfNA.length, outOfNA.slice(0,3).map(t => ({ src: t.source, lat: t.lat, lon: t.lon })));
})();
