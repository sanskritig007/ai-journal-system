export const EMOTION_COLORS = {
    calm: ['rgba(74,222,128,0.15)', '#4ade80'],
    peaceful: ['rgba(74,222,128,0.15)', '#4ade80'],
    joyful: ['rgba(251,191,36,0.15)', '#fbbf24'],
    happy: ['rgba(251,191,36,0.15)', '#fbbf24'],
    excited: ['rgba(251,191,36,0.18)', '#fcd34d'],
    anxious: ['rgba(239,68,68,0.15)', '#f87171'],
    sad: ['rgba(96,165,250,0.15)', '#60a5fa'],
    melancholy: ['rgba(96,165,250,0.15)', '#93c5fd'],
    grateful: ['rgba(167,139,250,0.15)', '#a78bfa'],
    reflective: ['rgba(167,139,250,0.12)', '#c4b5fd'],
};

export const AMBIENCE_COLOR = {
    forest: '#4ade80',
    ocean: '#60a5fa',
    mountain: '#a78bfa',
};

export const AMBIENCE_EMOJI = {
    forest: '🌲',
    ocean: '🌊',
    mountain: '🏔️',
};

export function capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function getEmotionStyle(emotion) {
    const key = (emotion || '').toLowerCase();
    const [bg, fg] = EMOTION_COLORS[key] || ['rgba(100,100,100,0.15)', '#aaa'];
    return { background: bg, color: fg, border: `1px solid ${fg}44` };
}
