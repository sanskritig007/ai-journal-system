import { useState, useEffect, useCallback } from 'react';

export function useJournal() {
    const [userId, setUserId] = useState(() => localStorage.getItem('arvyax_userId') || '');
    const [entries, setEntries] = useState([]);
    const [insights, setInsights] = useState(null);
    const [lastResult, setLastResult] = useState(null); // latest analysis result
    const [streamingRawText, setStreamingRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null); // { msg, type }

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Load entries from API ──────────────────────────
    const loadEntries = useCallback(async (uid) => {
        try {
            const res = await fetch(`/api/journal/${encodeURIComponent(uid)}`);
            const data = await res.json();
            setEntries(Array.isArray(data) ? data : []);
        } catch {
            setEntries([]);
        }
    }, []);

    // ── Load insights from API ─────────────────────────
    const loadInsights = useCallback(async (uid) => {
        try {
            const res = await fetch(`/api/journal/insights/${encodeURIComponent(uid)}`);
            const data = await res.json();
            setInsights(data);
        } catch {
            setInsights(null);
        }
    }, []);

    // Boot: fetch data for current userId
    useEffect(() => {
        loadEntries(userId);
        loadInsights(userId);
    }, [userId, loadEntries, loadInsights]);

    // ── Change userId ──────────────────────────────────
    const changeUserId = (newId) => {
        const trimmedId = newId.trim();
        if (!trimmedId) return false;

        const userIdRegex = /^[a-zA-Z0-9_]{3,30}$/;
        if (!userIdRegex.test(trimmedId)) {
            showToast('Invalid User ID. Use 3-30 letters, numbers, or underscores.', 'error');
            return false;
        }

        if (trimmedId === userId) return true;

        localStorage.setItem('arvyax_userId', trimmedId);
        setUserId(trimmedId);
        showToast('User ID updated ✓');
        return true;
    };

    // ── Save + Analyze ─────────────────────────────────
    const saveAndAnalyze = async ({ ambience, text }) => {
        const trimmedText = text.trim();
        if (!ambience) { showToast('Please choose an ambience.', 'error'); return; }
        if (!trimmedText) { showToast('Please write your journal entry.', 'error'); return; }

        if (trimmedText.length < 10 || !trimmedText.includes(' ')) {
            showToast('Journal entry too short or invalid. Please write a few more words.', 'error');
            return;
        }

        setLoading(true);
        setLastResult(null);
        setStreamingRawText("");

        try {
            const res = await fetch('/api/journal/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ambience, text: trimmedText }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Something went wrong');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let accumulatedRaw = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (!dataStr) continue;
                        
                        try {
                            const dataObj = JSON.parse(dataStr);
                            if (dataObj.error) {
                                throw new Error(dataObj.error);
                            }
                            if (dataObj.done) {
                                if (dataObj.cached) {
                                    setLastResult(JSON.parse(dataObj.chunk));
                                } else {
                                    const cleaned = accumulatedRaw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
                                    const jsonStart = cleaned.indexOf("{");
                                    const jsonEnd = cleaned.lastIndexOf("}") + 1;
                                    if (jsonStart >= 0 && jsonEnd > 0) {
                                        setLastResult(JSON.parse(cleaned.slice(jsonStart, jsonEnd)));
                                    }
                                }
                                setStreamingRawText("");
                            } else if (dataObj.chunk) {
                                accumulatedRaw += dataObj.chunk;
                                setStreamingRawText(accumulatedRaw);
                            }
                        } catch (e) {
                            if (e.name === 'Error') throw e; // from throw new Error(dataObj.error)
                        }
                    }
                }
            }

            showToast('Journal saved & analyzed ✓');

            // Refresh entries and insights
            await Promise.all([loadEntries(userId), loadInsights(userId)]);
            return true; // signal to clear form
        } catch (err) {
            showToast(err.message || 'Failed to save entry.', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        userId, changeUserId,
        entries, insights, lastResult, streamingRawText,
        loading, toast,
        saveAndAnalyze,
    };
}
