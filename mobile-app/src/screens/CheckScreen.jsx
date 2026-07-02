import { useState, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import { API_URL, EXAMPLES } from '../constants'

const STEPS = [
  { id: 'step1', label: 'Source Discovery', desc: 'Finding relevant medical sources' },
  { id: 'step2', label: 'Evidence Research', desc: 'Analyzing scientific evidence' },
  { id: 'step3', label: 'Verdict', desc: 'Generating final assessment' },
]

const RISK_META = {
  high:    { icon: '🚨', label: 'High Risk',   color: '#ef4444' },
  medium:  { icon: '⚠️',  label: 'Medium Risk', color: '#f59e0b' },
  low:     { icon: '✅',  label: 'Low Risk',    color: '#22c55e' },
  unknown: { icon: '❓',  label: 'Unknown',     color: '#94a3b8' },
}

export default function CheckScreen() {
  const C = useTheme()
  const [claim, setClaim]       = useState('')
  const [phase, setPhase]       = useState('idle')      // idle | streaming | result
  const [steps, setSteps]       = useState({})          // stepN -> data
  const [activeStep, setActive] = useState(0)
  const [result, setResult]     = useState(null)
  const [sources, setSources]   = useState([])
  const [error, setError]       = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])

  async function startVoice() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setIsTranscribing(true)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const fd = new FormData()
        fd.append('file', blob, 'recording.webm')
        try {
          const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: fd })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          if (data.text) setClaim(data.text)
          else setError('No speech detected.')
        } catch (e) {
          setError('Transcription failed: ' + e.message)
        } finally {
          setIsTranscribing(false)
        }
      }
      mr.start()
      mediaRef.current = mr
      setIsRecording(true)
    } catch (e) {
      setError('Microphone access denied.')
    }
  }

  function stopVoice() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
    setIsRecording(false)
  }

  async function submit() {
    if (!claim.trim()) return
    setPhase('streaming')
    setSteps({})
    setActive(1)
    setResult(null)
    setSources([])
    setError('')

    try {
      const res = await fetch(`${API_URL}/check-claim-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claim.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() // keep incomplete last line

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (currentEvent === 'step1') {
                setSteps(s => ({ ...s, step1: data }))
                setSources(data.sources || [])
                setActive(1)
              } else if (currentEvent === 'step2') {
                setSteps(s => ({ ...s, step2: data }))
                setActive(2)
              } else if (currentEvent === 'step3') {
                setSteps(s => ({ ...s, step3: data }))
                setActive(3)
              } else if (currentEvent === 'done') {
                setResult({ ...data.verdict, sources: data.sources, evidence: data.evidence })
                setPhase('result')
              } else if (currentEvent === 'error') {
                setError(data.message || 'An error occurred.')
                setPhase('idle')
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error('[Stream] error:', e)
      setError('Network error: ' + e.message)
      setPhase('idle')
    }
  }

  if (phase === 'streaming') return <StreamingView C={C} steps={steps} activeStep={activeStep} claim={claim} />
  if (phase === 'result')    return <ResultView    C={C} result={result} sources={sources} claim={claim} onReset={() => { setPhase('idle'); setClaim('') }} />

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: C.bg, padding: '20px 16px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-anim { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.accent}22, ${C.surface})`, borderRadius: 16, padding: '20px 16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔬</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Check Any Health Claim</div>
        <div style={{ fontSize: 13, color: C.subtext, lineHeight: 1.5 }}>AI-powered analysis using medical literature and trusted sources</div>
      </div>

      {error ? <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 12, color: '#b91c1c', fontSize: 14 }}>{error}</div> : null}

      {/* Input Card */}
      <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.subtext, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enter Health Claim</span>
        </div>
        {/* Recording hint banner */}
        {isRecording && (
          <div style={{ background: '#fef2f2', padding: '8px 16px', borderBottom: `1px solid #fecaca`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse-anim 1s infinite' }} />
            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Recording… Tap Stop when done — your speech will appear here</span>
          </div>
        )}
        {isTranscribing && (
          <div style={{ background: '#eff6ff', padding: '8px 16px', borderBottom: `1px solid #bfdbfe`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, border: '2px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>Transcribing your speech…</span>
          </div>
        )}
        <textarea
          value={isTranscribing ? '' : claim}
          onChange={e => setClaim(e.target.value)}
          placeholder={isTranscribing ? '' : isRecording ? 'Listening… speak your health claim now' : 'Type or speak any health claim you\'ve seen online...'}
          disabled={isRecording || isTranscribing}
          rows={4}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'transparent', border: 'none', outline: 'none',
            color: C.text, fontSize: 15, lineHeight: 1.6, resize: 'none',
            boxSizing: 'border-box', display: 'block',
            opacity: isTranscribing ? 0.4 : 1,
          }}
        />
        {isTranscribing && (
          <div style={{ position: 'relative', marginTop: -80, paddingBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 14, color: '#3b82f6', fontWeight: 600 }}>✍️ Transcribing...</span>
          </div>
        )}
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={isRecording ? stopVoice : startVoice}
            disabled={isTranscribing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: isRecording ? '#ef4444' : isTranscribing ? C.border : C.bg,
              color: isRecording ? '#fff' : isTranscribing ? C.muted : C.subtext,
              fontSize: 13, fontWeight: 600, cursor: isTranscribing ? 'not-allowed' : 'pointer',
              border: `1px solid ${isRecording ? '#ef4444' : C.border}`,
            }}
          >
            {isRecording ? '⏹ Stop Recording' : isTranscribing ? '⏳ Processing…' : '🎙 Voice'}
          </button>
          <span style={{ fontSize: 12, color: C.muted }}>{claim.length}/500</span>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={!claim.trim()}
        style={{
          width: '100%', padding: '16px', borderRadius: 14,
          background: claim.trim() ? C.accent : C.border,
          color: claim.trim() ? '#fff' : C.muted,
          fontSize: 16, fontWeight: 700, marginBottom: 20,
          transition: 'all 0.2s',
        }}
      >
        Analyze Claim →
      </button>

      {/* Examples */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Try an Example</div>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            onClick={() => setClaim(ex)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '12px 14px', marginBottom: 8, borderRadius: 12,
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 14, lineHeight: 1.5,
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Trust strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['PubMed', 'WHO', 'CDC', 'NHS', 'Mayo Clinic'].map(s => (
          <span key={s} style={{ fontSize: 11, padding: '4px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, color: C.muted }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

function StreamingView({ C, steps, activeStep, claim }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', background: C.bg }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔬</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Analyzing Claim</div>
        <div style={{ fontSize: 13, color: '#475569', marginTop: 6, padding: '0 20px', lineHeight: 1.5 }}>{claim}</div>
      </div>

      {STEPS.map((step, i) => {
        const done = activeStep > i + 1
        const active = activeStep === i + 1
        const pending = activeStep < i + 1
        const data = steps[step.id]

        return (
          <div key={step.id} style={{
            background: '#ffffff', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            border: `2px solid ${done ? '#22c55e' : active ? C.accent : '#e2e8f0'}`,
            transition: 'border-color 0.3s ease',
            animation: 'fadeSlideIn 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Step indicator */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: done ? '#22c55e' : active ? C.accent : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: done || active ? '#fff' : '#94a3b8',
                transition: 'background 0.3s ease',
              }}>
                {done ? '✓' : active ? (
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : i + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: pending ? '#94a3b8' : '#0f172a', transition: 'color 0.3s' }}>{step.label}</div>
                <div style={{ fontSize: 12, color: pending ? '#cbd5e1' : '#64748b', transition: 'color 0.3s' }}>{step.desc}</div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700 }}>
                {done && <span style={{ color: '#22c55e' }}>✓ Done</span>}
                {active && <span style={{ color: C.accent }}>Running…</span>}
                {pending && <span style={{ color: '#cbd5e1' }}>Waiting</span>}
              </div>
            </div>

            {/* Step 1 result preview */}
            {done && data && step.id === 'step1' && (data.sources || []).length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                {(data.sources || []).slice(0, 3).map((src, j) => (
                  <div key={j} style={{ fontSize: 12, color: '#475569', marginBottom: 3 }}>📌 {src.name}</div>
                ))}
              </div>
            )}

            {/* Step 2 result preview */}
            {done && data && step.id === 'step2' && data.evidence?.consensus && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{data.evidence.consensus?.slice(0, 100)}…</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ResultView({ C, result, sources, claim, onReset }) {
  const risk = result?.risk_level?.toLowerCase() || 'unknown'
  const meta = RISK_META[risk] || RISK_META.unknown
  const rawScore = result?.confidence_score
  const score = rawScore ? (rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore)) : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
      {/* Check Another — top */}
      <button
        onClick={onReset}
        style={{
          width: '100%', padding: '16px', background: C.accent, color: '#fff',
          fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        ← Check Another Claim
      </button>

      <div style={{ padding: '16px' }}>
        {/* Risk card */}
        <div style={{
          background: C.surface, borderRadius: 16, overflow: 'hidden',
          border: `1px solid ${C.border}`, marginBottom: 12,
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ padding: '16px', background: `${meta.color}18`, borderBottom: `1px solid ${meta.color}44`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>{meta.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk Assessment</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: meta.color }}>{meta.label}</div>
            </div>
            {score !== null && (
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${meta.color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: meta.color, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 9, color: C.subtext, textTransform: 'uppercase' }}>conf.</span>
              </div>
            )}
          </div>
          <div style={{ padding: '16px', background: '#fff', borderRadius: '0 0 16px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8, lineHeight: 1.4 }}>{claim}</div>
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{result?.explanation}</div>
          </div>
        </div>

        {/* Verdict */}
        {result?.verdict && (
          <div style={{ background: '#ffffff', borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Verdict</div>
            <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.6 }}>{result.verdict}</div>
          </div>
        )}

        {/* Evidence */}
        {result?.evidence && (
          <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Scientific Evidence
            </div>
            {result.evidence.consensus && (
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: '#f0f9ff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 4, textTransform: 'uppercase' }}>Scientific Consensus</div>
                <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.5 }}>{result.evidence.consensus}</div>
              </div>
            )}
            {result.evidence.evidence_for?.length > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 8, textTransform: 'uppercase' }}>Supporting Evidence</div>
                {result.evidence.evidence_for.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.4 }}>{e}</span>
                  </div>
                ))}
              </div>
            )}
            {result.evidence.evidence_against?.length > 0 && (
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 8, textTransform: 'uppercase' }}>Contradicting Evidence</div>
                {result.evidence.evidence_against.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.4 }}>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sources Consulted ({sources.length})
            </div>
            {sources.map((src, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < sources.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{src.name}</div>
                  {src.why_relevant && <div style={{ fontSize: 12, color: C.subtext, marginTop: 2, lineHeight: 1.4 }}>{src.why_relevant}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚕️</span>
          <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>This is AI-assisted analysis, not medical advice. Always consult a qualified healthcare professional.</div>
        </div>
      </div>
    </div>
  )
}
