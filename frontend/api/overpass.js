export default async function handler(req, res) {
  try {
    let body = req.body;

    // FIX: handle string body (VERY IMPORTANT on Vercel)
    if (typeof body === "string") {
      body = JSON.parse(body);
    }

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
      return res.status(500).json({
        error: "Overpass failed",
        status: response.status,
        preview: text.slice(0, 200),
      });
    }

    return res.status(200).json(JSON.parse(text));

  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
}