export default async function handler(req, res) {
  try {
    // IMPORTANT: safely extract body
    const query =
      typeof req.body === "string"
        ? req.body
        : req.body?.query;

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
      return res.status(response.status).json({
        error: "Overpass failed",
        details: text,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message,
    });
  }
}