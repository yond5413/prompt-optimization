"""
Utility functions for prompt processing and variable detection
"""
import re
from typing import List, Set


def extract_variables(prompt_content: str) -> List[str]:
    """
    Extract variable names from prompt content.
    
    Variables are defined as {variable_name} where variable_name follows
    Python identifier rules (starts with letter or underscore, contains
    alphanumeric characters and underscores).
    
    Args:
        prompt_content: The prompt text to analyze
        
    Returns:
        List of unique variable names in order of first appearance
    """
    if not prompt_content:
        return []
    
    # Pattern matches {variable_name} where variable_name is a valid Python identifier
    pattern = r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}'
    
    # Find all matches and preserve order while removing duplicates
    seen: Set[str] = set()
    variables: List[str] = []
    
    for match in re.finditer(pattern, prompt_content):
        var_name = match.group(1)
        if var_name not in seen:
            seen.add(var_name)
            variables.append(var_name)
    
    return variables


def validate_variable_mapping(
    prompt_variables: List[str],
    dataset_columns: List[str],
    variable_mapping: dict
) -> tuple[bool, str]:
    """
    Validate that a variable mapping is complete and correct.
    
    Args:
        prompt_variables: List of variables in the prompt
        dataset_columns: List of columns in the dataset
        variable_mapping: Mapping from prompt variables to dataset columns
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not prompt_variables:
        return True, ""
    
    # Check all prompt variables are mapped
    unmapped = set(prompt_variables) - set(variable_mapping.keys())
    if unmapped:
        return False, f"Unmapped variables: {', '.join(unmapped)}"
    
    # Check all mapped columns exist in dataset
    invalid_columns = set(variable_mapping.values()) - set(dataset_columns)
    if invalid_columns:
        return False, f"Invalid dataset columns: {', '.join(invalid_columns)}"
    
    return True, ""


def substitute_variables(prompt_template: str, variables: dict) -> str:
    """
    Substitute variables in a prompt template with their values.
    
    Args:
        prompt_template: The prompt text with {variable} placeholders
        variables: Dictionary mapping variable names to their values
        
    Returns:
        Prompt with all variables substituted
    """
    result = prompt_template
    for key, value in variables.items():
        placeholder = f"{{{key}}}"
        if placeholder in result:
            result = result.replace(placeholder, str(value))
    
    return result

