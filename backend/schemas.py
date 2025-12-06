from datetime import datetime
from typing import Any, Dict, Optional, Union

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginResponse(Token):
    role: str


class LoginInitResponse(BaseModel):
    mfa_required: bool
    temp_token: Optional[str] = None
    is_mfa_setup: Optional[bool] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    role: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str
    captcha_token: Optional[str] = None


class TempTokenRequest(BaseModel):
    temp_token: str


class MFASetupResponse(BaseModel):
    secret: str
    uri: str


class MFAVerifyRequest(TempTokenRequest):
    code: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    model_config = {"from_attributes": True}


class LogStatusUpdate(BaseModel):
    status: str


class BanIpRequest(BaseModel):
    ip_address: str
    reason: str


class SecurityStatus(BaseModel):
    locked_users: list[UserResponse]
    banned_ips: list[dict]


class AccessLogResponse(BaseModel):
    id: int
    user_id: int
    username: str
    user_is_locked: bool = False
    ip_address: str
    action: str
    status: str
    risk_score: int
    likelihood: int = 1
    impact: int = 1
    investigation_status: str = "NEW"
    timestamp: datetime
    log_metadata: Optional[Union[Dict[str, Any], str]] = None
    
    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Custom validator to extract username from relationship if it exists
        if hasattr(obj, "user") and obj.user:
             # When loading from ORM object, we need to manually inject the username
             # because Pydantic v2 doesn't automatically flatten the relationship
             return cls(
                 id=obj.id,
                 user_id=obj.user_id,
                 username=obj.user.username,
                 user_is_locked=obj.user.is_locked,
                 ip_address=obj.ip_address,
                 action=obj.action,
                 status=obj.status,
                 risk_score=obj.risk_score,
                 likelihood=obj.likelihood,
                 impact=obj.impact,
                 investigation_status=obj.investigation_status,
                 timestamp=obj.timestamp,
                 log_metadata=obj.log_metadata,
             )
        # Fallback for dictionary or other inputs
        return super().model_validate(obj, **kwargs)


class SecurityRuleCreate(BaseModel):
    name: str
    field: str
    operator: str
    value: str
    action: str
    rule_likelihood: int = 3
    rule_impact: int = 3
    is_active: bool = True


class SecurityRuleResponse(SecurityRuleCreate):
    id: int
    
    model_config = {"from_attributes": True}


class GenerateRuleRequest(BaseModel):
    prompt: str
