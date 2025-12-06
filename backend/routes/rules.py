from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import SecurityRule, User, RoleEnum
from schemas import SecurityRuleCreate, SecurityRuleResponse, GenerateRuleRequest
from services.ai_service import parse_rule
from utils import get_current_user

router = APIRouter(tags=["rules"])

def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource.",
        )
    return user

@router.post("/rules/generate")
def generate_rule(
    request: GenerateRuleRequest,
    _: User = Depends(get_current_admin)
):
    """
    Generates a Security Rule from natural language using AI.
    Does NOT save to DB.
    """
    try:
        rule_data = parse_rule(request.prompt)
        if not rule_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Invalid or unsafe request. Please provide a valid security rule description."
            )
        return rule_data
    except ValueError as e:
        # Malicious input detected
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="AI Service unavailable"
        )

@router.get("/rules", response_model=list[SecurityRuleResponse])
def list_rules(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    return db.query(SecurityRule).all()

@router.post("/rules", response_model=SecurityRuleResponse)
def create_rule(
    rule: SecurityRuleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    db_rule = SecurityRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    rule = db.query(SecurityRule).filter(SecurityRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}

