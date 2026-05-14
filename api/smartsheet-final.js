// api/smartsheet.js
// Fetches live Smartsheet data using Claude's Smartsheet integration

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk').default;
    
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: 'claude-opus-4-20250805',
      max_tokens: 15000,
      tools: [
        {
          type: 'builtin',
          name: 'mcp',
          resource: 'smartsheet',
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Fetch all data from the Smartsheet sheet with ID 1806045337833348 (PANW_Marketing_Planning).

Use the Smartsheet:get_sheet_summary tool to get ALL rows and ALL columns.

Return ONLY valid JSON in this exact format, nothing else:
{
  "rows": [
    { "cells": [value1, value2, value3, ...] },
    { "cells": [...] }
  ],
  "columns": [
    { "title": "Column1" },
    { "title": "Column2" },
    ...
  ]
}

Important: Make sure ALL 401 rows are included. Do not truncate or sample the data.`,
        },
      ],
    });

    // Extract JSON from Claude's response
    let jsonData = null;
    
    for (const block of message.content) {
      if (block.type === 'text') {
        try {
          // Find JSON in the text
          const jsonMatch = block.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.rows && parsed.columns) {
              jsonData = parsed;
              break;
            }
          }
        } catch (e) {
          console.log('Parse attempt failed:', e.message);
        }
      }
    }

    if (!jsonData || !jsonData.rows || !jsonData.columns) {
      return res.status(500).json({
        error: 'Failed to parse Smartsheet data from Claude response',
        details: message.content[0].text?.substring(0, 500)
      });
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(jsonData);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch data'
    });
  }
}
