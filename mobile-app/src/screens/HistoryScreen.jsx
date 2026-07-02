import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { API_URL } from '../constants'

const RISK_META = {
  high:    { icon: '🚨', label: 'High',   color: '#ef4444', bg: '#fee2e2' },
  medium:  { icon: '⚠️',  label: 'Medium', color: '#f59e0b', bg: '#fef3c7' },
  low:     { icon: '✅',  label: 'Safe',   color: '#22c55e', bg: '#dcfce7' },
  unknown: { icon: '❓',  label: '?',      color: '#94a3b8', bg: '#f1f5f9' },
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function HistoryScreen() {
  const C = useTheme()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [expanded, setExpanded] = useState(null)

  const fetchData = () => {
    fetch(`${API_URL}/checks/history`)
      .then(r => r.json())
      .then(d => { setHistory(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const filtered = filter === 'all' ? history : history.filter(h => (h.risk_level || '').toLowerCase() === filter)

  const counts = {
    total:  history.length,
    high:   history.filter(h => (h.risk_level || '').toLowerCase() === 'high').length,
    medium: history.filter(h => (h.risk_level || '').toLowerCase() === 'medium').length,
    low:    history.filter(h => (h.risk_level || '').toLowerCase() === 'low').length,
  }

  const barW = counts.total > 0 ? {
    high:   (counts.high   / counts.total) * 100,
    medium: (counts.medium / counts.total) * 100,
    low:    (counts.low    / counts.total) * 100,
  } : { high: 0, medium: 0, low: 0 }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg, minHeight: 0 }}>
      {/* Summary Bar */}
      <div style={{ background: C.surface, padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Total', val: counts.total, color: C.accent },
            { label: 'High',  val: counts.high,  color: '#ef4444' },
            { label: 'Med',   val: counts.medium, color: '#f59e0b' },
            { label: 'Safe',  val: counts.low,    color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: C.bg, borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
        {counts.total > 0 && (
          <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: C.border, display: 'flex' }}>
            <div style={{ width: `${barW.high}%`,   background: '#ef4444', transition: 'width 0.5s' }} />
            <div style={{ width: `${barW.medium}%`, background: '#f59e0b', transition: 'width 0.5s' }} />
            <div style={{ width: `${barW.low}%`,    background: '#22c55e', transition: 'width 0.5s' }} />
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {['all', 'high', 'medium', 'low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              fontSize: 13, fontWeight: 600,
              background: filter === f ? C.accent : C.bg,
              color:      filter === f ? '#fff'    : C.subtext,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
            }}
          >
            {f === 'all' ? 'All' : f === 'low' ? 'Safe' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({counts[f]})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.subtext }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14 }}>Loading history…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.subtext }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{filter === 'all' ? '📋' : RISK_META[filter]?.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 4 }}>No claims yet</div>
            <div style={{ fontSize: 13 }}>{filter === 'all' ? 'Analyze a health claim to see it here' : `No ${filter} risk claims found`}</div>
          </div>
        ) : filtered.map((item, i) => {
          const risk = (item.risk_level || 'unknown').toLowerCase()
          const meta = RISK_META[risk] || RISK_META.unknown
          const isOpen = expanded === i
          return (
            <div
              key={item.id || i}
              onClick={() => setExpanded(isOpen ? null : i)}
              style={{
                background: '#ffffff', borderRadius: 14, marginBottom: 10,
                border: `1px solid ${C.border}`, borderLeft: `4px solid ${meta.color}`,
                overflow: 'hidden', cursor: 'pointer',
              }}
            >
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 8, background: meta.bg }}>
                    <span style={{ fontSize: 12 }}>{meta.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(item.timestamp)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: isOpen ? 999 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.claim}
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, background: '#f8fafc' }}>
                  {item.explanation && (
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 8 }}>{item.explanation}</div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(item.timestamp).toLocaleString()}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
