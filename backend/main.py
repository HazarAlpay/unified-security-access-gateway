from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from middleware.security_headers import SecurityHeadersMiddleware
from middleware.sanitizer import InputSanitizerMiddleware

from routes.admin import router as admin_router
from routes.auth import router as auth_router
from routes.ws import router as ws_router
from routes.rules import router as rules_router

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(title="Unified Security Access Gateway")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1"])
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(InputSanitizerMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, strict allow list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(admin_router)
app.include_router(ws_router)
app.include_router(rules_router)


@app.get("/health")
def health_check():
    """Lightweight endpoint for uptime checks."""
    return {"status": "ok"}

