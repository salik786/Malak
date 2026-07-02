import json
import anthropic
from typing import AsyncGenerator
from .ai_service import client

async def run_pipeline(claim: str) -> AsyncGenerator[str, None]:
    """
    Streams 4 SSE events:
      step1 -> sources
      step2 -> evidence
      step3 -> verdict
      done  -> signal
    """

    def emit(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    # ── Step 1: Source Discovery ───────────────────────────────────────────────
    yield emit("status", {"step": 1, "message": "Finding authoritative sources…"})

    step1_prompt = f"""You are a health research assistant. A user submitted this health claim:
"{claim}"

Find 3-5 real, authoritative sources that are directly relevant to this specific claim.
Use only sources from: WHO, CDC, NIH, Mayo Clinic, Harvard Medical School, NHS UK, Cochrane, PubMed, WebMD, Cleveland Clinic.

Respond ONLY with valid JSON:
{{
  "sources": [
    {{
      "name": "Organization name",
      "url": "https://real-and-specific-url.org/relevant-page",
      "why_relevant": "One sentence explaining why this source is relevant to the claim"
    }}
  ]
}}"""

    step1_resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        temperature=0.0,
        system="You only output valid JSON. Always use real, specific URLs that exist.",
        messages=[{"role": "user", "content": step1_prompt}]
    )
    sources = _parse_json(step1_resp.content[0].text).get("sources", [])
    yield emit("step1", {"sources": sources})

    # ── Step 2: Evidence Research ──────────────────────────────────────────────
    yield emit("status", {"step": 2, "message": "Gathering evidence from sources…"})

    sources_text = "\n".join([f"- {s['name']}: {s['url']}" for s in sources])
    step2_prompt = f"""You are a medical evidence researcher. Analyze this health claim using the identified sources.

Claim: "{claim}"

Sources already identified:
{sources_text}

Gather the scientific evidence. For each side, provide 2-3 specific bullet points.

Respond ONLY with valid JSON:
{{
  "evidence_for": [
    "Specific evidence point supporting the claim",
    "Another supporting point"
  ],
  "evidence_against": [
    "Specific evidence point against the claim",
    "Another point against"
  ],
  "consensus": "A single sentence summarizing the current scientific consensus on this claim"
}}"""

    step2_resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        temperature=0.0,
        system="You only output valid JSON.",
        messages=[{"role": "user", "content": step2_prompt}]
    )
    evidence = _parse_json(step2_resp.content[0].text)
    yield emit("step2", {"evidence": evidence})

    # ── Step 3: Verdict & Rating ───────────────────────────────────────────────
    yield emit("status", {"step": 3, "message": "Generating final verdict…"})

    step3_prompt = f"""You are a senior health fact-checker making a final verdict.

Claim: "{claim}"

Sources: {json.dumps(sources)}
Evidence for: {json.dumps(evidence.get('evidence_for', []))}
Evidence against: {json.dumps(evidence.get('evidence_against', []))}
Scientific consensus: {evidence.get('consensus', '')}

Give a final risk assessment.

Respond ONLY with valid JSON:
{{
  "risk_level": "high | medium | low",
  "verdict": "A short 5-8 word verdict label (e.g. 'No scientific evidence supports this')",
  "explanation": "A clear 2-3 sentence plain-language explanation for a general audience",
  "confidence_score": 85
}}

risk_level guide:
- high: dangerous misinformation, could cause harm if followed
- medium: partially true, oversimplified, or lacks evidence
- low: well-supported by science, generally safe advice"""

    step3_resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        temperature=0.0,
        system="You only output valid JSON.",
        messages=[{"role": "user", "content": step3_prompt}]
    )
    verdict = _parse_json(step3_resp.content[0].text)
    if verdict.get("risk_level") not in ["high", "medium", "low"]:
        verdict["risk_level"] = "unknown"
    yield emit("step3", {"verdict": verdict})

    yield emit("done", {"sources": sources, "evidence": evidence, "verdict": verdict})


def _parse_json(text: str) -> dict:
    try:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].strip()
        return json.loads(text)
    except Exception:
        return {}
