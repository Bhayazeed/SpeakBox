import os
from typing import Tuple
from google import genai
from google.genai import types

# ============================================================================
# PRISMECHO AI SERVICE - Consistent Prompts with Best Practices
# ============================================================================

# System context for all prompts
SYSTEM_CONTEXT = """You are the AI assistant for PrismEcho, a spatial audio debate platform.
Your responses must be:
- CONCISE: Maximum 2-3 short bullet points or single sentences
- NEUTRAL: No bias toward any perspective
- STRUCTURED: Follow the exact output format requested
- DEBATE-FOCUSED: Capture key arguments, not filler words"""


class ModerationService:
    """Content moderation using Gemini AI."""
    
    BLOCKLIST_KEYWORDS = [
        "n-word", "k-word", "racial slur",
        "kill all", "death to", "genocide", "mass shooting",
        "white supremacy", "nazi", "holocaust denial",
    ]
    
    MODERATION_PROMPT = """<task>Content Moderation Check</task>
<context>You are moderating content for a professional debate platform.</context>

<rules>
Flag as UNSAFE if the content contains:
1. Hate speech (racial, religious, gender, sexuality-based)
2. Threats or calls for violence
3. Harassment or discrimination
4. Promotion of illegal activities
</rules>

<input>{text}</input>

<output_format>
Respond with exactly one word on the first line: SAFE or UNSAFE
If UNSAFE, add the specific reason on line 2 (max 10 words)
</output_format>"""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            print("Warning: GEMINI_API_KEY not found. Using keyword-only moderation.")
            self.client = None
    
    def _check_blocklist(self, text: str) -> Tuple[bool, str]:
        text_lower = text.lower()
        for keyword in self.BLOCKLIST_KEYWORDS:
            if keyword in text_lower:
                return False, "Content contains prohibited terms."
        return True, ""
    
    async def moderate_content(self, text: str) -> Tuple[bool, str]:
        is_safe, reason = self._check_blocklist(text)
        if not is_safe:
            return is_safe, reason
        
        if self.client:
            try:
                response = self.client.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=self.MODERATION_PROMPT.format(text=text),
                    config=types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(thinking_level="low"),
                        temperature=0.1  # Low temperature for consistent moderation
                    ),
                )
                result = response.text.strip()
                
                if result.upper().startswith("UNSAFE"):
                    lines = result.split('\n')
                    reason = lines[1].strip() if len(lines) > 1 else "Flagged by AI moderation."
                    return False, reason
                return True, ""
            except Exception as e:
                print(f"AI moderation error: {e}")
                return True, ""
        
        return True, ""


class LLMService:
    """LLM service for audio summarization and question generation."""
    
    # Prompt for summarizing audio - SUMMARY ONLY, no transcript
    AUDIO_SUMMARY_PROMPT = """<task>Summarize Audio for Debate Platform</task>
<context>{context}</context>

<instructions>
Listen to the audio and extract the KEY ARGUMENT being made.
Do NOT transcribe word-for-word.
Summarize the main point in 1-2 concise bullet points.
</instructions>

<output_format>
• [Main argument in under 15 words]
• [Supporting point if present, under 12 words]
</output_format>

<rules>
- Output ONLY bullet points, no introduction or explanation
- Use present tense ("argues", "believes", "questions")
- Capture the stance/opinion, not filler words
- Maximum 30 words total
</rules>"""

    # Prompt for generating opening questions
    OPENING_QUESTION_PROMPT = """<task>Generate Debate Opening Question</task>
<context>Creating the first node for a PrismEcho debate room.</context>

<topic>{topic}</topic>

<instructions>
Generate a single thought-provoking question that:
1. Is neutral (not leading toward any answer)
2. Invites multiple valid perspectives
3. Uses clear, accessible language
4. Creates genuine curiosity
</instructions>

<output_format>
Output ONLY the question, no quotes, no explanation.
Maximum 18 words.
</output_format>

<examples>
Topic: "Climate change policies"
Good: "How should we balance economic growth with environmental protection?"
Bad: "Don't you think we need stricter climate laws?" (leading)

Topic: "AI in education"
Good: "What role should AI play in how students learn?"
Bad: "Should AI replace teachers?" (oversimplified binary)
</examples>"""

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            print("Warning: GEMINI_API_KEY not found.")
            self.client = None

    async def transcribe_and_summarize_audio(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> Tuple[str, str]:
        """
        Summarize audio content directly (no transcript returned).
        Returns (empty_string, summary) for backward compatibility.
        """
        if not self.client:
            return "", "Voice contribution"
        
        try:
            response = self.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                    self.AUDIO_SUMMARY_PROMPT.format(context=SYSTEM_CONTEXT)
                ],
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    temperature=0.3  # Slightly creative but consistent
                ),
            )
            
            summary = response.text.strip()
            
            # Clean up response - ensure it's just bullet points
            if not summary.startswith("•"):
                lines = summary.split("\n")
                summary = "\n".join(line for line in lines if line.strip().startswith("•"))
            
            if not summary:
                summary = "• Voice contribution recorded"
            
            return "", summary
            
        except Exception as e:
            print(f"Audio processing error: {e}")
            return "", "• Voice contribution"

    async def summarize_voice(self, transcript: str) -> str:
        """Summarize text into bullet points."""
        if not self.client:
            return transcript[:100] + "..." if len(transcript) > 100 else transcript
        
        try:
            response = self.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=f"""<task>Summarize Debate Point</task>
<input>{transcript}</input>
<output>
Output 1-2 bullet points (max 15 words each).
Format: • [point]
No introduction, just bullets.
</output>""",
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    temperature=0.2
                ),
            )
            return response.text.strip()
        except Exception as e:
            return f"• {transcript[:50]}..."
    
    async def generate_opening_question(self, topic: str) -> str:
        """Generate a neutral opening question for a debate topic."""
        if not self.client:
            return f"What are your thoughts on {topic}?"
        
        try:
            response = self.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=self.OPENING_QUESTION_PROMPT.format(topic=topic),
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    temperature=0.5  # More creative for questions
                ),
            )
            
            result = response.text.strip()
            
            # Clean up: remove quotes if present
            result = result.strip('"\'')
            
            # Ensure it ends with ?
            if not result.endswith("?"):
                result += "?"
            
            return result
        except Exception as e:
            return f"What are your thoughts on {topic}?"
