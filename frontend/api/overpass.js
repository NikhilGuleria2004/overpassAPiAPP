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

export default async function handler(req, res) {
  try {
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

    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(query),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return res.status(502).json({
        error: "Overpass failed",
        status: response.status,
        preview: text.slice(0, 200),
      });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
