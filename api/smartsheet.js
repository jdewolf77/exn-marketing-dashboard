// api/smartsheet.js
// This is a Vercel serverless function that fetches data from Smartsheet
// Deploy to Vercel and it becomes: https://your-domain.vercel.app/api/smartsheet

export default async function handler(req, res) {
  // Enable CORS so your dashboard can call this from any domain
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get the API token from environment variables (set in Vercel dashboard)
    const apiToken = process.env.SMARTSHEET_API_TOKEN;
    const sheetId = process.env.SMARTSHEET_SHEET_ID || '1806045337833348';

    if (!apiToken) {
      return res.status(400).json({ 
        error: 'SMARTSHEET_API_TOKEN not configured in environment variables' 
      });
    }

    // Fetch from Smartsheet API
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${sheetId}?pageSize=500`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Smartsheet API Error ${response.status}:`, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid Smartsheet API token. Check your environment variables.' 
        });
      }
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'Sheet not found. Check your SMARTSHEET_SHEET_ID.' 
        });
      }
      
      throw new Error(`Smartsheet API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response for 5 minutes to avoid rate limiting
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(data);

  } catch (error) {
    console.error('Error fetching Smartsheet data:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch Smartsheet data' 
    });
  }
}
