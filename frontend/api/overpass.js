const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
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

  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
      });

      const text = await response.text();
      if (!response.ok) {
        lastError = {
          endpoint,
          status: response.status,
          preview: text.slice(0, 200),
        };
        continue;
      }

      return JSON.parse(text);
    } catch (error) {
      lastError = { endpoint, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const message = lastError?.preview
    ? `Overpass failed at ${lastError.endpoint} (${lastError.status})`
    : `Overpass request failed at ${lastError?.endpoint}: ${lastError?.error}`;

  const err = new Error(message);
  err.info = lastError;
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
