export default async function handler(req, res) {
  try {
    // IMPORTANT: Vercel requires explicit parsing sometimes
    let body = req.body;

    // If body is string, parse it
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const query = body?.query;

    if (!query) {
      return res.status(400).json({
        error: "Missing query",
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

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "Overpass failed",
        details: text,
      });
    }

    const data = await response.json();

    return res.status(200).json(data);

  } catch (err) {
    console.error("API error:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}