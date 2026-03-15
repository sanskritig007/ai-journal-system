const axios = require("axios");
const crypto = require("crypto");
const redisClient = require("../utils/redisClient");

const API_KEY = process.env.GEMINI_API_KEY;

async function analyzeEmotion(text) {
    // 1. Check Cache
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const cacheKey = `analysis:${hash}`;

    try {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            console.log("Redis Cache Hit:", cacheKey);
            return JSON.parse(cachedResult);
        }
    } catch (err) {
        console.error("Redis Cache Read Error:", err);
    }

    console.log("Redis Cache Miss - Calling Gemini API");

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

    const result = JSON.parse(cleaned.slice(jsonStart, jsonEnd));

    // 2. Save to Cache
    try {
        // Cache result for 24 hours (86400 seconds)
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(result));
    } catch (err) {
        console.error("Redis Cache Write Error:", err);
    }

    return result;
}

module.exports = analyzeEmotion;