// src/lib/callReasoningModel.ts

/**
 * Single fetch wrapper to the Cloud Run / Firebase Functions reasoning endpoint.
 * Swapping Gemini/Claude/GPT touches only this file.
 */
export async function callReasoningModel(prompt: string): Promise<any> {
  try {
    // In P1, this will point to your secure Firebase Cloud Function URL
    // which holds the AI Studio key securely in its environment secrets.
    const response = await fetch("/api/reasoning", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Security headers mapped from SECTION: SECURITY
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
      body: JSON.stringify({prompt}),
    });

    if (!response.ok) {
      throw new Error(`Reasoning endpoint failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[SECURITY] Reasoning model call failed:", error);
    // Malformed-JSON/Failure fallback per PILLAR 1 Performance Safeguards
    return null;
  }
}
