import { useState, useEffect, useCallback } from 'react';

// Auto-generate a userId that persists in localStorage
function getOrCreateUserId() {
    let id = localStorage.getItem('arvyax_userId');
    if (!id) {
        id = 'user_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('arvyax_userId', id);
    }
    return id;
}

export function useJournal() {
    const [userId, setUserId] = useState(getOrCreateUserId);
    const [entries, setEntries] = useState([]);
    const [insights, setInsights] = useState(null);
    const [lastResult, setLastResult] = useState(null); // latest analysis result
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

        try {
            const res = await fetch('/api/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ambience, text: text.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');

            if (data.emotion) {
                setLastResult(data);
                showToast('Journal saved & analyzed ✓');
            } else {
                showToast('Entry saved! (AI analysis temporarily unavailable)');
            }

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
        entries, insights, lastResult,
        loading, toast,
        saveAndAnalyze,
    };
}
