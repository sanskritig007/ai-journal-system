const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

async function analyzeEmotion(text) {
    const prompt = `Analyze this journal entry and return ONLY a valid JSON object with exactly these keys:
- "emotion": a single word describing the dominant emotion (e.g. calm, anxious, joyful, sad)
- "keywords": an array of 3-5 relevant words from the text
- "summary": one sentence summarizing the user's mental state

Journal: "${text}"

Respond with ONLY the JSON object, no markdown, no explanation.`;

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: 0.3,
            },
        }
    );

    const output = response.data.candidates[0].content.parts[0].text.trim();

    // Strip markdown code fences if present
    const cleaned = output.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}") + 1;

    return JSON.parse(cleaned.slice(jsonStart, jsonEnd));
}

module.exports = analyzeEmotion;