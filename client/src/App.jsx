import { useState } from 'react';
import { useJournal } from './useJournal';
import { AMBIENCE_COLOR, AMBIENCE_EMOJI, capitalize, getEmotionStyle } from './utils';
import './index.css';

/* Floating particles (decorative) */
function Particles() {
  const ps = [
    { left: '10%', dur: '12s', delay: '0s', w: '3px' },
    { left: '25%', dur: '18s', delay: '3s', w: '2px' },
    { left: '50%', dur: '14s', delay: '6s', w: '3px' },
    { left: '70%', dur: '20s', delay: '1s', w: '2px' },
    { left: '85%', dur: '16s', delay: '9s', w: '4px' },
  ];

  return ps.map((p, i) => (
    <div
      key={i}
      className="particle"
      style={{ left: p.left, animationDuration: p.dur, animationDelay: p.delay, width: p.w, height: p.w }}
    />
  ));
}

/* Ambience selector */
const AMBIENCES = [
  { value: 'forest', emoji: '🌲', name: 'Forest', desc: 'Deep & grounding' },
  { value: 'ocean', emoji: '🌊', name: 'Ocean', desc: 'Vast & freeing' },
  { value: 'mountain', emoji: '🏔️', name: 'Mountain', desc: 'Clear & still' },
];

function AmbienceSelector({ selected, onSelect }) {
  return (
    <>
      <p className="section-label">1 - Choose your session ambience</p>
      <div className="ambience-grid">
        {AMBIENCES.map((a) => (
          <div
            key={a.value}
            className={`amb-card ${a.value}${selected === a.value ? ' selected' : ''}`}
            onClick={() => onSelect(a.value)}
          >
            <span className="amb-emoji">{a.emoji}</span>
            <div className="amb-name">{a.name}</div>
            <div className="amb-desc">{a.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* Journal form */
function JournalForm({ onSubmit, loading }) {
  const [ambience, setAmbience] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    const cleared = await onSubmit({ ambience, text });
    if (cleared) setText('');
  };

  return (
    <>
      <AmbienceSelector selected={ambience} onSelect={setAmbience} />

      <p className="section-label">2 - Write your journal entry</p>
      <div className="journal-card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={`How did the session make you feel? What did you notice, hear, or sense?\n\nLet your thoughts flow naturally...`}
        />
        <div className="card-footer">
          <span className="char-count">{text.length} / 1000</span>
        </div>
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="spinner" /> : <span>🔍</span>}
        <span>{loading ? 'Analyzing...' : 'Save & Analyze Emotion'}</span>
      </button>
    </>
  );
}

/* Emotion result card */
function ResultCard({ result }) {
  if (!result?.emotion) return null;
  const style = getEmotionStyle(result.emotion);

  return (
    <div className="result-card">
      <div className="result-header">
        <div className="emotion-badge" style={style}>
          ✦ {result.emotion}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Latest analysis</span>
      </div>
      <p className="result-summary">{result.summary}</p>
      <div className="keywords-row">
        {(result.keywords || []).map((k) => (
          <span key={k} className="keyword-chip">{k}</span>
        ))}
      </div>
    </div>
  );
}

/* Insights dashboard */
function Insights({ data }) {
  if (!data) return null;
  const ambienceEmoji = AMBIENCE_EMOJI[data.mostUsedAmbience] || data.mostUsedAmbience || '-';

  return (
    <>
      <p className="section-label" style={{ marginBottom: 16 }}>Mental state insights</p>
      <div className="insights-grid">
        <div className="insight-tile">
          <span className="insight-value">{data.totalEntries ?? '-'}</span>
          <span className="insight-label">Total Entries</span>
        </div>
        <div className="insight-tile">
          <span className="insight-value">{data.topEmotion ? capitalize(data.topEmotion) : '-'}</span>
          <span className="insight-label">Top Emotion</span>
        </div>
        <div className="insight-tile">
          <span className="insight-value" style={{ fontSize: 20 }}>{ambienceEmoji}</span>
          <span className="insight-label">Fav Ambience</span>
        </div>
      </div>
      {data.recentKeywords?.length > 0 && (
        <div className="keywords-cloud">
          {data.recentKeywords.map((k) => (
            <span key={k} className="keyword-chip">{k}</span>
          ))}
        </div>
      )}
    </>
  );
}

/* Past entries feed */
function EntriesList({ entries }) {
  if (!entries.length) {
    return (
      <div className="empty-state">
        <span className="icon">🍃</span>
        No entries yet. Write your first one above!
      </div>
    );
  }

  return (
    <div className="entries-list">
      {entries.map((entry, i) => {
        const emotionStyle = getEmotionStyle(entry.emotion);
        const dotColor = AMBIENCE_COLOR[entry.ambience] || '#aaa';
        const date = entry.createdAt ? new Date(entry.createdAt + ' UTC').toLocaleString() : '';

        return (
          <div key={entry.id} className="entry-item" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="entry-amb-dot" style={{ background: dotColor }} title={entry.ambience} />
            <div className="entry-body">
              <div className="entry-text">{entry.text}</div>
              <div className="entry-meta">
                {entry.emotion && (
                  <span className="entry-emotion-tag" style={emotionStyle}>
                    {entry.emotion}
                  </span>
                )}
                <span className="entry-date">{entry.ambience} · {date}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Toast notification */
function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div className={`toast${toast.type === 'error' ? ' error' : ''}`}>
      {toast.msg}
    </div>
  );
}

/* Root App */
export default function App() {
  const {
    userId,
    changeUserId,
    entries,
    insights,
    lastResult,
    loading,
    toast,
    saveAndAnalyze,
  } = useJournal();

  return (
    <>
      <Particles />

      <div className="wrap">
        <header>
          <div className="logo-badge"><span>🌿</span> ArvyaX</div>
          <h1>Your <em>Nature</em> Journal</h1>
          <p>Write after your immersive session. The AI understands how you feel.</p>
        </header>

        <div className="user-bar">
          <div className="user-dot" />
          <span>User ID:</span>
          <input
            type="text"
            defaultValue={userId}
            onBlur={(e) => changeUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && changeUserId(e.target.value)}
            maxLength={40}
          />
        </div>

        <JournalForm onSubmit={saveAndAnalyze} loading={loading} />
        <ResultCard result={lastResult} />

        <div className="divider" />
        <Insights data={insights} />

        <div className="divider" />
        <p className="section-label" style={{ marginBottom: 16 }}>Past entries</p>
        <EntriesList entries={entries} />
      </div>

      <Toast toast={toast} />
    </>
  );
}
