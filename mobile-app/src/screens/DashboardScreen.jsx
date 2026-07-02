import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import { API_URL } from '../constants'

function buildDailyData(history, days = 7) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en', { weekday: 'short' })
    const items = history.filter(h => (h.timestamp || '').slice(0, 10) === key)
    result.push({
      key, label,
      high:   items.filter(h => (h.risk_level || '').toLowerCase() === 'high').length,
      medium: items.filter(h => (h.risk_level || '').toLowerCase() === 'medium').length,
      low:    items.filter(h => (h.risk_level || '').toLowerCase() === 'low').length,
      total:  items.length,
    })
  }
  return result
}

function DailyChart({ data, C }) {
  const [tooltip, setTooltip] = useState(null)
  const maxVal = Math.max(...data.map(d => d.total), 1)

  return (
    <div style={{ position: 'relative', padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
        {data.map((d, i) => {
          const hH = (d.high   / maxVal) * 100
          const mH = (d.medium / maxVal) * 100
          const lH = (d.low    / maxVal) * 100
          return (
            <div
              key={d.key}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setTooltip(tooltip === i ? null : i)}
            >
              {d.total > 0 && <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{d.total}</div>}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 80, borderRadius: '4px 4px 0 0', overflow: 'hidden', background: C.border }}>
                <div style={{ background: '#22c55e', height: `${lH}%`, transition: 'height 0.5s' }} />
                <div style={{ background: '#f59e0b', height: `${mH}%`, transition: 'height 0.5s' }} />
                <div style={{ background: '#ef4444', height: `${hH}%`, transition: 'height 0.5s' }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{d.label}</div>
              {tooltip === i && (
                <div style={{ position: 'absolute', bottom: 30, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', zIndex: 10, whiteSpace: 'nowrap', fontSize: 11, color: C.text, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.key}</div>
                  <div style={{ color: '#ef4444' }}>High: {d.high}</div>
                  <div style={{ color: '#f59e0b' }}>Medium: {d.medium}</div>
                  <div style={{ color: '#22c55e' }}>Safe: {d.low}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
        {[['#ef4444', 'High'], ['#f59e0b', 'Med'], ['#22c55e', 'Safe']].map(([col, lbl]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
            <span style={{ fontSize: 10, color: C.muted }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardScreen() {
  const C = useTheme()
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeFilter, setActiveFilter] = useState(null)

  const fetchData = () => {
    fetch(`${API_URL}/checks/history`)
      .then(r => r.json())
      .then(d => { setHistory(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    // refresh every 30s
    const interval = setInterval(fetchData, 30000)
    // refresh when tab becomes visible
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const counts = {
    total:  history.length,
    high:   history.filter(h => (h.risk_level || '').toLowerCase() === 'high').length,
    medium: history.filter(h => (h.risk_level || '').toLowerCase() === 'medium').length,
    low:    history.filter(h => (h.risk_level || '').toLowerCase() === 'low').length,
  }

  const avgPerDay = counts.total > 0 ? (counts.total / 7).toFixed(1) : '0'

  const dailyData = buildDailyData(history, 7)

  const filteredClaims = activeFilter
    ? history.filter(h => (h.risk_level || '').toLowerCase() === activeFilter)
    : history

  const RISK_META = {
    high:    { icon: '🚨', label: 'High Risk',   color: '#ef4444', bg: '#fee2e2' },
    medium:  { icon: '⚠️',  label: 'Medium',      color: '#f59e0b', bg: '#fef3c7' },
    low:     { icon: '✅',  label: 'Safe',         color: '#22c55e', bg: '#dcfce7' },
    unknown: { icon: '❓',  label: 'Unknown',      color: '#94a3b8', bg: '#f1f5f9' },
  }

  const STAT_CARDS = [
    { key: null,     label: 'Total',   value: counts.total,  color: C.accent,  icon: '📊' },
    { key: 'high',   label: 'High',    value: counts.high,   color: '#ef4444', icon: '🚨' },
    { key: 'medium', label: 'Medium',  value: counts.medium, color: '#f59e0b', icon: '⚠️' },
    { key: 'low',    label: 'Safe',    value: counts.low,    color: '#22c55e', icon: '✅' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: C.bg, padding: '12px 16px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {STAT_CARDS.map(card => (
          <button
            key={String(card.key)}
            onClick={() => setActiveFilter(activeFilter === card.key ? null : card.key)}
            style={{
              background: C.surface, borderRadius: 14, padding: '14px',
              textAlign: 'left', cursor: 'pointer',
              border: `2px solid ${activeFilter === card.key ? card.color : C.border}`,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
          </button>
        ))}
      </div>

      {/* Daily chart */}
      <div style={{ background: C.surface, borderRadius: 14, padding: '14px 14px 10px', border: `1px solid ${C.border}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Last 7 Days</div>
          <div style={{ fontSize: 11, color: C.muted, background: C.bg, padding: '3px 8px', borderRadius: 20, border: `1px solid ${C.border}` }}>{avgPerDay}/day avg</div>
        </div>
        {loading ? (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>Loading…</div>
        ) : (
          <DailyChart data={dailyData} C={C} />
        )}
      </div>

      {/* Risk distribution bar */}
      {counts.total > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Risk Distribution</div>
          <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: C.border, display: 'flex' }}>
            <div style={{ width: `${(counts.high   / counts.total) * 100}%`, background: '#ef4444' }} />
            <div style={{ width: `${(counts.medium / counts.total) * 100}%`, background: '#f59e0b' }} />
            <div style={{ width: `${(counts.low    / counts.total) * 100}%`, background: '#22c55e' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {[
              { label: `${Math.round((counts.high   / counts.total) * 100)}% High`,   color: '#ef4444' },
              { label: `${Math.round((counts.medium / counts.total) * 100)}% Med`,    color: '#f59e0b' },
              { label: `${Math.round((counts.low    / counts.total) * 100)}% Safe`,   color: '#22c55e' },
            ].map(s => <span key={s.label} style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</span>)}
          </div>
        </div>
      )}

      {/* Filtered claims list */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>
        {activeFilter ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Risk Claims` : 'All Claims'}
        <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 6 }}>({filteredClaims.length})</span>
      </div>

      {filteredClaims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: C.subtext, fontSize: 13 }}>No claims found</div>
      ) : filteredClaims.slice(0, 20).map((item, i) => {
        const risk = (item.risk_level || 'unknown').toLowerCase()
        const meta = RISK_META[risk] || RISK_META.unknown
        return (
          <div key={item.id || i} style={{
            background: C.surface, borderRadius: 12, marginBottom: 8, padding: '12px 14px',
            border: `1px solid ${C.border}`, borderLeft: `3px solid ${meta.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.icon} {meta.label}</span>
              <span style={{ fontSize: 10, color: C.muted }}>{(item.timestamp || '').slice(0, 10)}</span>
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.claim}
            </div>
          </div>
        )
      })}
    </div>
  )
}
