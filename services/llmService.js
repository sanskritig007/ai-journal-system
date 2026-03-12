const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

async function analyzeEmotion(text) {

const prompt = `
Analyze the journal entry.

Return ONLY JSON with keys:
emotion
keywords (array)
summary

Journal: "${text}"
`;

const response = await axios.post(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
{
contents: [
{
parts: [{ text: prompt }]
}
]
}
);

const output = response.data.candidates[0].content.parts[0].text;

const jsonStart = output.indexOf("{");
const jsonEnd = output.lastIndexOf("}") + 1;

return JSON.parse(output.slice(jsonStart, jsonEnd));

}

module.exports = analyzeEmotion;