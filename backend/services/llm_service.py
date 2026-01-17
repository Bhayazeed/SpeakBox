import os
import google.generativeai as genai
from typing import Tuple

class ModerationService:
    """Content moderation service using Gemini AI for detecting harmful content."""
    
    # Blocklist for instant rejection (obvious violations)
    BLOCKLIST_KEYWORDS = [
        # Racial slurs and hate speech (abbreviated for safety)
        "n-word", "k-word", "racial slur",
        # Violence
        "kill all", "death to", "genocide", "mass shooting",
        # Extremism
        "white supremacy", "nazi", "holocaust denial",
    ]
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            print("Warning: GEMINI_API_KEY not found. Using keyword-only moderation.")
            self.model = None
    
    def _check_blocklist(self, text: str) -> Tuple[bool, str]:
        """Quick check against obvious violations."""
        text_lower = text.lower()
        for keyword in self.BLOCKLIST_KEYWORDS:
            if keyword in text_lower:
                return False, f"Content contains prohibited terms."
        return True, ""
    
    async def moderate_content(self, text: str) -> Tuple[bool, str]:
        """
        Check if content is safe for the platform.
        Returns (is_safe, reason)
        """
        # First pass: Blocklist check
        is_safe, reason = self._check_blocklist(text)
        if not is_safe:
            return is_safe, reason
        
        # Second pass: AI moderation (if available)
        if self.model:
            try:
                prompt = f"""You are a content moderator for a debate platform. Analyze this text and determine if it's safe.

Text: "{text}"

Rules - Flag as UNSAFE if it contains:
1. Hate speech targeting race, religion, gender, sexuality
2. Calls for violence or threats
3. Discrimination or harassment
4. Illegal activity promotion

Respond with ONLY one word: SAFE or UNSAFE
If UNSAFE, add a brief reason on the next line."""

                response = self.model.generate_content(prompt)
                result = response.text.strip()
                
                if result.upper().startswith("UNSAFE"):
                    lines = result.split('\n')
                    reason = lines[1] if len(lines) > 1 else "Content flagged by AI moderation."
                    return False, reason
                    
                return True, ""
                
            except Exception as e:
                print(f"AI moderation error: {e}")
                # Fail open - allow content if AI is unavailable
                return True, ""
        
        return True, ""


class LLMService:
    """LLM service for text summarization and generation."""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            print("Warning: GEMINI_API_KEY not found.")
            self.model = None

    async def summarize_voice(self, transcript: str) -> str:
        """Summarize a voice recording transcript into key points."""
        if not self.model:
            return transcript[:100] + "..." if len(transcript) > 100 else transcript
        
        try:
            prompt = f"""Summarize this debate contribution into 2-3 concise bullet points. 
Keep each point under 15 words. Focus on the key argument.

Transcript: "{transcript}"

Return only the bullet points, no introduction."""

            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Summary unavailable: {str(e)}"
    
    async def generate_opening_question(self, topic: str) -> str:
        """Generate an engaging opening question for a debate topic."""
        if not self.model:
            return f"What are your thoughts on: {topic}?"
        
        try:
            prompt = f"""Generate a thought-provoking opening question for a debate on this topic:
Topic: "{topic}"

The question should:
- Be neutral and balanced
- Invite multiple perspectives
- Be under 20 words

Return only the question, no explanation."""

            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"What are your thoughts on: {topic}?"
