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

async function streamAnalysis(text, res, onComplete) {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const cacheKey = `analysis:${hash}`;

    try {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
            console.log("Redis Cache Hit (Stream):", cacheKey);
            res.write(`data: ${JSON.stringify({ chunk: cachedResult, done: true, cached: true })}\n\n`);
            res.end();
            if (onComplete) onComplete(JSON.parse(cachedResult));
            return;
        }
    } catch (err) {
        console.error("Redis Cache Read Error:", err);
    }

    console.log("Redis Cache Miss - Calling Gemini API (Stream)");

    const prompt = `Analyze this journal entry and return ONLY a valid JSON object with exactly these keys:
- "emotion": a single word describing the dominant emotion (e.g. calm, anxious, joyful, sad)
- "keywords": an array of 3-5 relevant words from the text
- "summary": one sentence summarizing the user's mental state

Journal: "${text}"

Respond with ONLY the JSON object, no markdown, no explanation.`;

    try {
        const response = await axios({
            method: 'post',
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${API_KEY}&alt=sse`,
            data: {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }
            },
            responseType: 'stream'
        });

        let buffer = '';
        let fullOutput = '';
        
        response.data.on('data', chunk => {
            buffer += chunk.toString();
            let boundary = buffer.indexOf('\n');
            while (boundary !== -1) {
                const line = buffer.slice(0, boundary).trim();
                buffer = buffer.slice(boundary + 1);
                
                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6);
                    if (dataStr !== '[DONE]') {
                        try {
                            const dataObj = JSON.parse(dataStr);
                            if (dataObj.candidates && dataObj.candidates[0].content && dataObj.candidates[0].content.parts) {
                                const textChunk = dataObj.candidates[0].content.parts[0].text;
                                if (textChunk) {
                                    fullOutput += textChunk;
                                    res.write(`data: ${JSON.stringify({ chunk: textChunk, done: false })}\n\n`);
                                }
                            }
                        } catch (e) {}
                    }
                }
                boundary = buffer.indexOf('\n');
            }
        });

        response.data.on('end', async () => {
            const cleaned = fullOutput.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}") + 1;
            
            let parsedResult = null;
            if(jsonStart >= 0 && jsonEnd > 0) {
               try {
                   const resultJson = cleaned.slice(jsonStart, jsonEnd);
                   parsedResult = JSON.parse(resultJson); // validate
                   await redisClient.setEx(cacheKey, 86400, resultJson);
               } catch(err) {
                   console.error("Failed to parse stream JSON:", err);
               }
            }
            
            res.write(`data: ${JSON.stringify({ chunk: "", done: true })}\n\n`);
            res.end();

            if (parsedResult && onComplete) onComplete(parsedResult);
        });

    } catch (error) {
        console.error("Gemini stream error", error.message);
        res.write(`data: ${JSON.stringify({ error: "LLM stream failed" })}\n\n`);
        res.end();
    }
}

module.exports = { analyzeEmotion, streamAnalysis };