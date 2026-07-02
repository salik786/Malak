import { useTheme } from '../ThemeContext'

const HOW_IT_WORKS = [
  { step: '1', icon: '✍️', title: 'Enter a Claim',       desc: 'Type or speak any health claim you have seen online or heard from someone.' },
  { step: '2', icon: '🔍', title: 'Source Discovery',    desc: 'Our AI identifies the most relevant medical databases and research sources.' },
  { step: '3', icon: '📚', title: 'Evidence Research',   desc: 'We analyze peer-reviewed studies and expert consensus to evaluate the claim.' },
  { step: '4', icon: '⚖️', title: 'Verdict Delivered',   desc: 'Receive a clear risk rating with explanation and links to the supporting evidence.' },
]

const RISK_GUIDE = [
  { icon: '🚨', level: 'High Risk',   color: '#ef4444', bg: '#fee2e2', desc: 'Claim is likely false or dangerous. Do not follow this advice.' },
  { icon: '⚠️', level: 'Medium Risk', color: '#f59e0b', bg: '#fef3c7', desc: 'Claim is partially true or lacks sufficient evidence. Proceed with caution.' },
  { icon: '✅', level: 'Low Risk',    color: '#22c55e', bg: '#dcfce7', desc: 'Claim is generally supported by scientific evidence.' },
]

const FEATURES = [
  '🔬 Powered by Claude AI (Anthropic)',
  '📡 Real-time streaming analysis',
  '🎙 Voice input with Whisper transcription',
  '🌙 Light & dark mode support',
  '📱 Works offline as a PWA',
  '🔒 No account required',
]

export default function AboutScreen() {
  const C = useTheme()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: C.bg }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent}, #8b5cf6)`, borderRadius: 20, padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}>MALAK</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
          Medical AI for Laypeople — Analyzing Knowledge
        </div>
        <div style={{ marginTop: 12, display: 'inline-block', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
          v1.0 · Built for Clinicians & the Public
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: C.surface, borderRadius: 16, padding: '16px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>How It Works</div>
        {HOW_IT_WORKS.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < HOW_IT_WORKS.length - 1 ? 16 : 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${C.accent}22`, border: `2px solid ${C.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: C.subtext, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Risk guide */}
      <div style={{ background: C.surface, borderRadius: 16, padding: '16px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Risk Level Guide</div>
        {RISK_GUIDE.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < RISK_GUIDE.length - 1 ? 12 : 0, padding: '10px 12px', borderRadius: 12, background: r.bg }}>
            <span style={{ fontSize: 20 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: r.color, marginBottom: 2 }}>{r.level}</div>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ background: C.surface, borderRadius: 16, padding: '16px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Features</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ fontSize: 14, color: C.text, lineHeight: 1.4 }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚕️ Medical Disclaimer</div>
        <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          MALAK is an AI-powered tool for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making health decisions.
        </div>
      </div>
    </div>
  )
}
