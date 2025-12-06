from sqlalchemy.orm import Session
from models import SecurityRule
import logging

logger = logging.getLogger(__name__)

class RuleEngine:
    @staticmethod
    def evaluate(context: dict, db: Session):
        """
        Evaluates all active security rules against the provided context.
        Returns:
            tuple: (list of actions triggered, max_likelihood, max_impact)
        """
        rules = db.query(SecurityRule).filter(SecurityRule.is_active == True).all()
        
        triggered_actions = []
        max_likelihood = 1
        max_impact = 1
        
        for rule in rules:
            try:
                field_value = context.get(rule.field)
                
                # Skip if field is missing in context
                if field_value is None:
                    continue
                
                is_match = False
                rule_value = rule.value
                
                # Convert types for numerical comparisons if needed
                if rule.operator in ['gt', 'lt']:
                    try:
                        # Try converting both to float for comparison
                        field_val_num = float(field_value)
                        rule_val_num = float(rule_value)
                        
                        if rule.operator == 'gt':
                            is_match = field_val_num > rule_val_num
                        elif rule.operator == 'lt':
                            is_match = field_val_num < rule_val_num
                    except (ValueError, TypeError):
                        # If conversion fails, skip or log warning
                        logger.warning(f"Could not convert values for rule {rule.name}: {field_value} vs {rule_value}")
                        continue
                
                elif rule.operator == 'equals':
                    # String comparison
                    is_match = str(field_value) == str(rule_value)
                    
                elif rule.operator == 'not_equals':
                    is_match = str(field_value) != str(rule_value)
                    
                elif rule.operator == 'contains':
                    is_match = str(rule_value).lower() in str(field_value).lower()
                
                if is_match:
                    if rule.action not in triggered_actions:
                        triggered_actions.append(rule.action)
                    
                    # NIST Approach: High Watermark
                    max_likelihood = max(max_likelihood, rule.rule_likelihood)
                    max_impact = max(max_impact, rule.rule_impact)
                    
                    logger.info(f"Rule Triggered: {rule.name} (Action: {rule.action}, L={rule.rule_likelihood}, I={rule.rule_impact})")
                    
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.name}: {e}")
                continue
                
        return triggered_actions, max_likelihood, max_impact
