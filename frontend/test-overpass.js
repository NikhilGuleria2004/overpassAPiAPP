const query = `[out:json][timeout:60];(area["name"="Kerala"]["admin_level"~"^[2345]$"]["boundary"="administrative"];area["name:en"="Kerala"]["admin_level"~"^[2345]$"]["boundary"="administrative"];)->.state;(rel(area.state)["admin_level"="6"]["boundary"="administrative"];rel(area.state)["admin_level"="7"]["boundary"="administrative"];);out tags;`;

const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

(async () => {
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }).toString(),
      });
      const text = await res.text();
      console.log('ENDPOINT', endpoint, 'STATUS', res.status);
      console.log(text.slice(0, 250).replace(/\n/g, ' '));
    } catch (err) {
      console.error('ENDPOINT', endpoint, 'ERROR', err.message);
    }
  }
})();