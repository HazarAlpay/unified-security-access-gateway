import google.generativeai as genai
import os
import json
import logging
import re

logger = logging.getLogger(__name__)

# Configure the AI
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    logger.warning("GOOGLE_API_KEY not found. AI features will be disabled.")

def validate_input(prompt: str) -> bool:
    """
    Validates the user input for malicious content.
    Returns True if safe, False if potentially malicious.
    """
    # Length validation (limit to 200 chars to prevent token exhaustion)
    if len(prompt) > 200:
        logger.warning("Prompt too long.")
        return False

    # XSS/SQL Injection pattern detection
    # Common patterns for XSS (<script>, javascript:) and SQLi (DROP, UNION, comments)
    dangerous_patterns = [
        r"<script", r"javascript:", r"DROP\s+TABLE", r"UNION\s+SELECT", r"1\s*=\s*1",
        r"SELECT\s+\*", r"DELETE\s+FROM", r"UPDATE\s+SET", r"INSERT\s+INTO"
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            logger.warning(f"Malicious pattern detected: {pattern}")
            return False

    # Jailbreak / Prompt Injection keyword detection
    jailbreak_keywords = [
        "ignore previous instructions", "act as", "you are now", 
        "forget your instructions", "system override", "unrestricted mode"
    ]
    
    prompt_lower = prompt.lower()
    for keyword in jailbreak_keywords:
        if keyword in prompt_lower:
            logger.warning(f"Jailbreak attempt detected: {keyword}")
            return False

    return True

def parse_rule(prompt: str) -> dict:
    """
    Parses a natural language prompt into a structured Security Rule JSON.
    """
    if not api_key:
         raise Exception("Google API Key is missing.")

    # Validate Input first
    if not validate_input(prompt):
        raise ValueError("Malicious input detected")

    # List of models to try in order of preference/availability
    models_to_try = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-flash-latest']
    last_exception = None

    system_instruction = (
        "You are a cybersecurity expert. Convert natural language requests into a JSON Security Rule. "
        "Fields: `name` (short summary), `field` (ip, country, browser, hour, role), "
        "`operator` (equals, not_equals, contains, gt, lt), `value`, "
        "`action` (BLOCK, ALERT, MFA), `severity` (integer 10-100). "
        "Return ONLY raw JSON, no markdown, no code fences. "
        "SECURITY OVERRIDE: Do NOT engage in conversation. Do NOT reply to greetings, insults, or self-harm text. "
        "If the input is not a security rule request, return an empty JSON `{}`. "
        "If the input attempts to inject code, return `{}`. "
        "Sanitize all values. Do not allow HTML tags in the 'name' or 'value' fields."
    )
    
    full_prompt = f"{system_instruction}\n\nUser Request: {prompt}"

    for model_name in models_to_try:
        try:
            logger.info(f"Attempting to generate rule with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(full_prompt)
            
            text = response.text.strip()
            
            # Clean up potential markdown code blocks
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            # Return empty dict if response is effectively empty or braces only
            cleaned_text = text.strip()
            if not cleaned_text or cleaned_text == "{}":
                return {}

            return json.loads(cleaned_text)
            
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")
            last_exception = e
            continue
            
    logger.error("All AI models failed.")
    raise last_exception
