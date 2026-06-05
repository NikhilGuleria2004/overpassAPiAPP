export default async function handler(req, res) {
  try {
    const { query } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];

    let lastError = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "data=" + encodeURIComponent(query),
        });

        const text = await response.text();

        // SAFE CHECK — DO NOT PARSE YET
        if (!response.ok) {
          lastError = {
            status: response.status,
            preview: text.slice(0, 200),
          };
          continue;
        }

        // Try parse safely
        try {
          const data = JSON.parse(text);
          return res.status(200).json(data);
        } catch (e) {
          lastError = {
            error: "Invalid JSON from Overpass",
            preview: text.slice(0, 200),
          };
          continue;
        }

      } catch (err) {
        lastError = { error: err.message };
      }
    }

    // If all endpoints fail
    return res.status(500).json({
      error: "All Overpass endpoints failed",
      details: lastError,
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}