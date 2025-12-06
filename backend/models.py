from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship

from database import Base

class RoleEnum(str, PyEnum):
    ADMIN = "admin"
    EMPLOYEE = "employee"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.EMPLOYEE)
    mfa_secret = Column(String(64), nullable=False)
    is_mfa_enabled = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    last_known_ip = Column(String(45))
    last_user_agent = Column(String(512))
    last_known_country = Column(String(60))
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    access_logs = relationship("AccessLog", back_populates="user")
    sessions = relationship("ActiveSession", back_populates="user")


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String(45), nullable=False)
    country = Column(String(60))
    action = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    risk_score = Column(Integer, default=0, nullable=False)
    investigation_status = Column(String(20), default="NEW", nullable=False)
    log_metadata = Column(JSON, nullable=True)
    user = relationship("User", back_populates="access_logs")


class BlacklistedIp(Base):
    __tablename__ = "blacklisted_ips"

    ip_address = Column(String(45), primary_key=True, index=True)
    reason = Column(Text, nullable=False)
    banned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    banned_by = Column(String(50), nullable=True)


class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(512))
    location = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="sessions")


class IpRateLimit(Base):
    __tablename__ = "ip_rate_limits"

    ip_address = Column(String(45), primary_key=True, index=True)
    failure_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SecurityRule(Base):
    __tablename__ = "security_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    field = Column(String(50), nullable=False)  # e.g., 'country', 'ip', 'hour'
    operator = Column(String(20), nullable=False)  # 'equals', 'contains', 'gt', 'lt'
    value = Column(String(255), nullable=False)
    action = Column(String(20), nullable=False)  # 'BLOCK', 'MFA', 'ALERT'
    is_active = Column(Boolean, default=True)
    severity = Column(Integer, default=0)

