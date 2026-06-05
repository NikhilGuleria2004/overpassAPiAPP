export default async function handler(req, res) {
  try {
    // Read request body
    const query = req.body;

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    // Call Overpass API from SERVER (no CORS issues here)
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

    // Handle Overpass errors properly
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: "Overpass API error",
        details: text,
      });
    }

    const data = await response.json();

    // Send result back to frontend
    res.status(200).json(data);

  } catch (err) {
    console.error("API error:", err);

    res.status(500).json({
      error: "Server error",
      message: err.message,
    });
  }
}