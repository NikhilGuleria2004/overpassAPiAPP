export default async function handler(req, res) {
  try {
    let body = req.body;

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

    const text = await response.text(); // IMPORTANT (not json yet)

    // Try safe JSON parse
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid Overpass response",
        raw: text.slice(0, 300), // debug info
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("API crash:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}