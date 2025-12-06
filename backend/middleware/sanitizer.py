import bleach
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import json

class InputSanitizerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Determine content type
                content_type = request.headers.get("Content-Type", "")
                
                if "application/json" in content_type:
                    body = await request.json()
                    cleaned_body = self.sanitize_data(body)
                    
                    # Re-package the body for the next handler
                    # This is tricky in Starlette/FastAPI because request.stream() is consumed.
                    # We need to override receive.
                    
                    async def receive():
                        return {"type": "http.request", "body": json.dumps(cleaned_body).encode("utf-8")}
                    
                    request._receive = receive
                    
            except Exception:
                # If parsing fails, proceed (let FastAPI handle validataion errors)
                pass
                
        response = await call_next(request)
        return response

    def sanitize_data(self, data):
        if isinstance(data, dict):
            return {k: self.sanitize_data(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_data(item) for item in data]
        elif isinstance(data, str):
            return bleach.clean(data, strip=True)
        return data

