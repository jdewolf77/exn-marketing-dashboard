// api/data.js
// Vercel serverless function - fetches live data from Smartsheet

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sheetId = process.env.SMARTSHEET_SHEET_ID || "1806045337833348";
    const apiToken = process.env.SMARTSHEET_API_TOKEN;

    if (!apiToken) {
      return res.status(400).json({
        error: "SMARTSHEET_API_TOKEN environment variable not set",
      });
    }

    // Fetch data from Smartsheet
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}?pageSize=500`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Smartsheet API error ${response.status}:`, error);

      if (response.status === 401) {
        return res.status(401).json({
          error: "Invalid Smartsheet API token",
        });
      }
      if (response.status === 404) {
        return res.status(404).json({
          error: "Sheet not found",
        });
      }

      throw new Error(`Smartsheet API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform Smartsheet API response to match dashboard format
    const transformed = {
      columns: data.columns.map((col) => ({
        title: col.title,
        id: col.id,
      })),
      rows: data.rows.map((row) => ({
        id: row.id,
        cells: row.cells.map((cell) => cell.value || ""),
      })),
    };

    // Cache for 5 minutes
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).json(transformed);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch data",
    });
  }
}
