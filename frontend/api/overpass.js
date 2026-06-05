const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

async function readJsonBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function fetchOverpass(query) {
  const payload = new URLSearchParams({ data: query }).toString();
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
    "User-Agent": "CitiesAPI/1.0 (+https://overpass-a-pi-app.vercel.app)",
  };

  const failures = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: payload,
      });

      const text = await response.text();
      if (!response.ok) {
        failures.push({ endpoint, status: response.status, preview: text.slice(0, 200) });
        continue;
      }

      return JSON.parse(text);
    } catch (error) {
      failures.push({ endpoint, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const details = failures.map(f => {
    if (f.status) {
      return `${f.endpoint} => ${f.status}`;
    }
    return `${f.endpoint} => ${f.error}`;
  });
  const message = `All Overpass endpoints failed: ${details.join("; ")}`;
  const err = new Error(message);
  err.info = failures;
  throw err;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({
        message: "This endpoint accepts POST requests with JSON { query }. Use the app UI or POST to /api/overpass.",
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = await readJsonBody(req);
    const query = body?.query;

    if (!query) {
      return res.status(400).json({
        error: "Missing query",
        receivedBody: body,
      });
    }

    const data = await fetchOverpass(query);
    return res.status(200).json(data);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const extra = err?.info ? { details: err.info } : {};
    return res.status(502).json({ error: errorMessage, ...extra });
  }
}
