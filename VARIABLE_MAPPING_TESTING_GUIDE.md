# Variable Mapping & Manual Dataset Feature - Testing Guide

## Overview
This guide provides step-by-step instructions to test the new variable mapping and manual dataset creation features.

## Prerequisites
1. Backend and frontend servers running
2. Database migration applied: `20250101_add_variable_mapping.sql`
3. User authenticated in the application

## Test Scenarios

### Test 1: Create Manual Dataset with Custom Columns

**Steps:**
1. Navigate to Datasets page (`/datasets`)
2. Click "Add Dataset" button
3. Select "Manual Entry" tab
4. Fill in:
   - Dataset Name: "Leasing Assistant Test"
   - Description: "Test dataset for leasing assistant prompt"
5. In the Dataset Builder:
   - Note default columns: `input` and `expected_output`
   - Click "Add Column" and add: `leasor`
   - Click "Add Column" and add: `inquiry`
6. Click "Add Row" and fill in first row:
   - `leasor`: "Bayview Apartments"
   - `inquiry`: "Do you have 1-bedroom apartments available?"
   - `expected_output`: "Thank you for your inquiry..."
7. Add 2-3 more rows with different data
8. Click "Create Dataset"

**Expected Results:**
- Dataset created successfully
- Redirected to datasets list
- New dataset appears with source "manual"
- Dataset has 3+ rows

### Test 2: Create Prompt with Variables

**Steps:**
1. Navigate to Prompts page (`/prompts`)
2. Click "Create Prompt"
3. Fill in:
   - Name: "Leasing Assistant"
   - Task Type: "generation"
   - Content: 
     ```
     Respond as an AI leasing assistant at {leasor}, answering text messages from residents or prospective residents.
     
     Use only available tools and data—never make up info. For prospective residents, gather info (name, email, bedrooms, etc.) if missing, schedule tours using availability tools.
     
     Stay on leasing topics, be concise, polite, and ask clarifying questions if needed.
     
     Never share technology details. Address customers by first name only, and always check your tools before answering. Only provide one message per response. Assume the year is 2025 for date references.
     
     User message: {inquiry}
     ```
4. Click "Create"

**Expected Results:**
- Prompt created successfully
- Variables `{leasor}` and `{inquiry}` detected automatically
- Stored in `prompts.variables` column

### Test 3: Variable Detection Display

**Steps:**
1. Navigate to the prompt created in Test 2
2. Look for "Detected Variables" section

**Expected Results:**
- Should display badges showing `{leasor}` and `{inquiry}`
- Variables extracted from prompt content

### Test 4: Run Evaluation with Variable Mapping

**Steps:**
1. Navigate to Evaluations page (`/evaluations`)
2. Click "New Evaluation Run"
3. Select:
   - Prompt: "Leasing Assistant"
   - Version: Version 1 (Active)
   - Dataset: "Leasing Assistant Test"
4. Click "Start Evaluation"

**Expected Results:**
- Variable Mapping Dialog appears automatically
- Shows two variables to map:
  - `{leasor}` → dropdown with dataset columns
  - `{inquiry}` → dropdown with dataset columns
- Preview section shows example substitution using first row
- Auto-mapping suggests matching column names if available

### Test 5: Configure Variable Mapping

**Steps:**
1. In the Variable Mapping Dialog:
   - Map `{leasor}` to column `leasor`
   - Map `{inquiry}` to column `inquiry`
2. Verify preview shows correct values from first dataset row
3. Click "Confirm Mapping"

**Expected Results:**
- Mapping saved
- Evaluation starts running
- Status changes to "running"

### Test 6: Verify Evaluation Results

**Steps:**
1. Wait for evaluation to complete (status: "completed")
2. Click "View" to see evaluation details
3. Check evaluation results

**Expected Results:**
- Each row evaluated with variables substituted correctly
- `actual_output` shows LLM responses to substituted prompts
- Scores calculated for each example
- Aggregate scores displayed

### Test 7: Edit Dataset Rows

**Steps:**
1. Navigate to dataset detail page (if implemented)
2. Click on a cell to edit
3. Change value
4. Click checkmark to save

**Expected Results:**
- Cell value updates
- Changes persisted to database

### Test 8: Add/Remove Columns

**Steps:**
1. In Dataset Builder, add new column "priority"
2. Fill in values for existing rows
3. Remove a non-required column
4. Save changes

**Expected Results:**
- New column added to all rows
- Removed column data deleted
- Schema updated in database

### Test 9: Variable Mapping Validation

**Steps:**
1. Create evaluation with prompt containing variables
2. Select dataset without matching columns
3. In mapping dialog, leave one variable unmapped
4. Try to confirm

**Expected Results:**
- Error message: "Unmapped variables: [variable_name]"
- Cannot proceed until all variables mapped
- Clear validation feedback

### Test 10: Dataset with No Custom Schema

**Steps:**
1. Create evaluation with:
   - Prompt with variables
   - Starter dataset (no custom schema)
2. Start evaluation

**Expected Results:**
- No mapping dialog appears
- Evaluation proceeds normally
- Uses default `input` field

## Edge Cases to Test

### Edge Case 1: Special Characters in Variables
- Create prompt with `{user_name}` (underscore)
- Verify detection and mapping works

### Edge Case 2: Duplicate Column Names
- Try to add column with existing name
- Should show error and prevent

### Edge Case 3: Empty Dataset
- Try to create dataset with no rows
- Should show validation error

### Edge Case 4: Missing Required Columns
- Mark column as required
- Try to add row without filling required column
- Should show validation error

### Edge Case 5: Variable Not in Dataset
- Map variable to non-existent column
- Should show error during validation

## API Endpoints to Test

### Backend Endpoints

1. **GET /api/prompts/{id}/variables**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:8000/api/prompts/{id}/variables
   ```
   Expected: Returns detected and stored variables

2. **POST /api/datasets/manual**
   ```bash
   curl -X POST -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","column_schema":{"columns":{"col1":{"type":"text"}},"order":["col1"]}}' \
     http://localhost:8000/api/datasets/manual
   ```
   Expected: Creates dataset with custom schema

3. **POST /api/datasets/{id}/rows**
   ```bash
   curl -X POST -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"rows":[{"col1":"value1"}]}' \
     http://localhost:8000/api/datasets/{id}/rows
   ```
   Expected: Adds rows to dataset

4. **POST /api/evaluations** (with mapping)
   ```bash
   curl -X POST -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt_version_id":"...","dataset_id":"...","variable_mapping":{"var1":"col1"}}' \
     http://localhost:8000/api/evaluations
   ```
   Expected: Creates evaluation with variable mapping

## Database Verification

After running tests, verify database state:

```sql
-- Check prompt variables
SELECT id, name, variables FROM prompts WHERE name = 'Leasing Assistant';

-- Check dataset column schema
SELECT id, name, column_schema FROM datasets WHERE source = 'manual';

-- Check evaluation variable mapping
SELECT id, variable_mapping FROM evaluations WHERE variable_mapping IS NOT NULL;

-- Check dataset samples structure
SELECT input FROM dataset_samples WHERE dataset_id = '...' LIMIT 1;
```

## Success Criteria

✅ Can create manual datasets with custom columns
✅ Can add/edit/delete rows in dataset builder
✅ Variables auto-detected from prompt content
✅ Variable mapping dialog appears when needed
✅ Can map variables to dataset columns
✅ Preview shows correct substitution
✅ Evaluation runs with mapped variables
✅ Results show correctly substituted prompts
✅ All validation errors display correctly
✅ Database stores all data correctly

## Troubleshooting

### Issue: Variable mapping dialog doesn't appear
- Check that prompt has variables (use `{variable}` syntax)
- Check that dataset has `column_schema` (manual datasets only)
- Check browser console for errors

### Issue: Evaluation fails with mapping
- Verify all variables are mapped
- Check that mapped columns exist in dataset samples
- Review backend logs for substitution errors

### Issue: Dataset builder not saving
- Check authentication token is valid
- Verify backend API endpoints are accessible
- Check network tab for failed requests

### Issue: Variables not detected
- Ensure variables use correct syntax: `{variable_name}`
- Variable names must start with letter or underscore
- Check that prompt content is saved

## Next Steps

After successful testing:
1. Document any bugs found
2. Test with larger datasets (100+ rows)
3. Test with complex prompts (10+ variables)
4. Performance test variable substitution
5. Test concurrent evaluations with mapping

