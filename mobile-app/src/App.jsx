import { useState } from 'react'
import { ThemeProvider, useTheme } from './ThemeContext'
import CheckScreen     from './screens/CheckScreen'
import HistoryScreen   from './screens/HistoryScreen'
import DashboardScreen from './screens/DashboardScreen'
import AboutScreen     from './screens/AboutScreen'

const TABS = [
  { id: 'check',     label: 'Check',     icon: CheckIcon },
  { id: 'history',   label: 'History',   icon: HistoryIcon },
  { id: 'dashboard', label: 'Clinician', icon: DashIcon },
  { id: 'about',     label: 'About',     icon: AboutIcon },
]

function CheckIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function HistoryIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 0 .5-3"/><path d="M3 4v4h4"/>
    </svg>
  )
}
function DashIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function AboutIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English',    active: true  },
  { code: 'ar', flag: '🇸🇦', label: 'العربية',    active: false },
  { code: 'zh', flag: '🇨🇳', label: '中文',        active: false },
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt', active: false },
  { code: 'pa', flag: '🇵🇰', label: 'ਪੰਜਾਬੀ',      active: false },
  { code: 'es', flag: '🇪🇸', label: 'Español',     active: false },
]

function Shell() {
  const C = useTheme()
  const [tab, setTab]         = useState('check')
  const [showLang, setShowLang] = useState(false)

  const Screen = tab === 'check'     ? CheckScreen
               : tab === 'history'   ? HistoryScreen
               : tab === 'dashboard' ? DashboardScreen
               :                       AboutScreen

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 480, margin: '0 auto', background: C.bg, position: 'relative' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔬</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>MALAK</div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Health Claim Checker</div>
          </div>
        </div>
        <button
          onClick={() => setShowLang(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          🇬🇧 EN <span style={{ fontSize: 10, color: C.muted }}>▼</span>
        </button>
      </div>

      {/* Screen area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Screen />
      </div>

      {/* Bottom tabs */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', flexShrink: 0 }}>
        {TABS.map(t => {
          const active = tab === t.id
          const color = active ? C.accent : C.muted
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                borderTop: `2px solid ${active ? C.accent : 'transparent'}`,
                transition: 'all 0.2s',
              }}
            >
              <t.icon color={color} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Language modal */}
      {showLang && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
          onClick={() => setShowLang(false)}
        >
          <div
            style={{ background: C.surface, borderRadius: '20px 20px 0 0', padding: '16px 16px 24px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 14px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Select Language</div>
            {LANGUAGES.map(l => (
              <div
                key={l.code}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: 12, marginBottom: 6,
                  background: l.active ? `${C.accent}18` : C.bg,
                  border: `1px solid ${l.active ? C.accent : C.border}`,
                  cursor: l.active ? 'pointer' : 'default',
                  opacity: l.active ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{l.flag}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: l.active ? C.text : C.subtext }}>{l.label}</span>
                </div>
                {l.active
                  ? <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: `${C.accent}22`, padding: '2px 8px', borderRadius: 10 }}>Active</span>
                  : <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, background: C.border, padding: '2px 8px', borderRadius: 10 }}>Soon</span>
                }
              </div>
            ))}
            <button
              onClick={() => setShowLang(false)}
              style={{ width: '100%', marginTop: 8, padding: '13px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  )
}
