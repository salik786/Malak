import os
import json
import anthropic
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

class SourceCitation(BaseModel):
    name: str
    url: str

class ClaimResult(BaseModel):
    matched_claim: Optional[str] = None
    risk_level: str
    explanation: str
    sources: List[SourceCitation] = []

# Load .env from the malak-mvp directory (two levels up from this file)
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=env_path)

api_key = os.environ.get("ANTHROPIC_API_KEY")
client = None
if api_key:
    client = anthropic.Anthropic(api_key=api_key)

def load_knowledge_base():
    file_path = os.path.join(os.path.dirname(__file__), "knowledge_base.json")
    with open(file_path, "r") as f:
        return json.load(f)

def check_claim_with_ai(claim_text: str) -> ClaimResult:
    kb_data = load_knowledge_base()

    if not client:
        # Local fallback - keyword matching
        claim_lower = claim_text.lower()
        for fact in kb_data:
            if claim_lower in fact['claim'].lower() or fact['claim'].lower() in claim_lower:
                return ClaimResult(
                    matched_claim=fact['claim'],
                    risk_level=fact['risk_level'],
                    explanation=fact['explanation'],
                    sources=[SourceCitation(**s) for s in fact.get('sources', [])]
                )
        return ClaimResult(
            matched_claim="",
            risk_level="unknown",
            explanation="We couldn't find a matching health fact for this claim in our database (Local Mode).",
            sources=[]
        )

    kb_json = json.dumps(kb_data)

    prompt = f"""You are an expert health fact-checker for a multilingual health app.

Given the user's health claim, use the provided knowledge base to find the best match (even if phrased differently or in broken English).
If matched, return the knowledge base entry's details including ALL sources.
If NO close match exists, use your medical knowledge to assess the claim: assign a risk level, write a clear explanation, and provide up to 3 real authoritative health sources with their real URLs.

Knowledge Base:
{kb_json}

User Claim: "{claim_text}"

Respond ONLY with a valid JSON object:
{{
  "matched_claim": "The exact claim string from the knowledge base (or null if no match)",
  "risk_level": "high | medium | low | unknown",
  "explanation": "A clear, plain language explanation in 2-3 sentences",
  "sources": [
    {{"name": "Source name", "url": "https://real-url.org/page"}},
    ...
  ]
}}

Always include at least 1 source. Use real URLs from WHO, CDC, NIH, Mayo Clinic, Harvard Medical, etc."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        temperature=0.0,
        system="You are a helpful assistant that only outputs valid JSON. Always include real, working URLs in sources.",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    try:
        content = response.content[0].text
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()

        data = json.loads(content)

        if data.get("risk_level") not in ["high", "medium", "low"]:
            data["risk_level"] = "unknown"
            if not data.get("explanation"):
                data["explanation"] = "We couldn't find a matching health fact for this claim in our database."

        raw_sources = data.get("sources", [])
        sources = []
        for s in raw_sources:
            if isinstance(s, dict) and s.get("name") and s.get("url"):
                sources.append(SourceCitation(name=s["name"], url=s["url"]))

        return ClaimResult(
            matched_claim=data.get("matched_claim") or "",
            risk_level=data.get("risk_level") or "unknown",
            explanation=data.get("explanation") or "We couldn't verify this claim.",
            sources=sources
        )
    except Exception as e:
        print(f"Error parsing AI response: {e}")
        print(f"Raw content: {response.content[0].text if response.content else 'No content'}")
        return ClaimResult(
            matched_claim="",
            risk_level="unknown",
            explanation="An error occurred while processing the claim.",
            sources=[]
        )
