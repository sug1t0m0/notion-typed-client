# E2E Test Database Template

This document describes the exact database structure required for E2E tests. You must create these databases manually in Notion before running the tests.

## Prerequisites

1. **Notion Integration**
   - Create at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Grant full access (Read, Update, Insert content)
   - Copy the Internal Integration Token

2. **Parent Page**
   - Create a page to contain the test databases
   - Share the page with your integration

## Database 1: E2E Test Database

**Database Name:** `E2E Test Database`

### Required Properties

| Property Name (日本語) | Property Type | Configuration | Notes |
|----------------------|--------------|---------------|--------|
| **タイトル** | Title | - | Required, primary field |
| **説明** | Rich Text | - | For test descriptions |
| **ステータス** | Status | Groups & Options below | **Must be created manually** |
| **優先度** | Select | Options: `低`, `中`, `高` | Single select |
| **タグ** | Multi-select | Options: `重要`, `確認待ち`, `バグ`, `改善` | Multiple select |
| **担当者** | People | - | User assignment |
| **進捗率** | Number | Format: Percent | Progress percentage |
| **期限** | Date | - | Due date field |
| **完了** | Checkbox | - | Completion flag |
| **カテゴリー** | Relation | → E2E Categories database | See Database 2 |

### Status Property Configuration

The Status property must be configured with these groups:

#### Group: To Do
- **Color:** Gray
- **Options:**
  - `未着手` (Not started)

#### Group: In Progress
- **Color:** Blue
- **Options:**
  - `進行中` (In progress)
  - `レビュー待ち` (Waiting for review)

#### Group: Complete
- **Color:** Green
- **Options:**
  - `完了` (Complete)

### Select/Multi-select Options Colors (Optional)

For better visual organization:
- **優先度 (Priority):**
  - `低` → Gray
  - `中` → Yellow
  - `高` → Red

- **タグ (Tags):**
  - `重要` → Red
  - `確認待ち` → Yellow
  - `バグ` → Orange
  - `改善` → Blue

## Database 2: E2E Categories

**Database Name:** `E2E Categories`

### Required Properties

| Property Name (日本語) | Property Type | Configuration | Notes |
|----------------------|--------------|---------------|--------|
| **名前** | Title | - | Category name |
| **色** | Select | Options: `赤`, `青`, `緑`, `黄` | Category color |
| **Related to E2E Test Database (カテゴリー)** | Relation | ← E2E Test Database | Auto-created when setting up the relation |

### Select Options Colors (Optional)

- `赤` → Red
- `青` → Blue
- `緑` → Green
- `黄` → Yellow

## Setup Steps

### Step 1: Create E2E Categories Database
1. Create new database named `E2E Categories`
2. Add **名前** property as Title
3. Add **色** property as Select with the 4 color options

### Step 2: Create E2E Test Database
1. Create new database named `E2E Test Database`
2. Add all properties from the table above
3. **Important:** For the Status property:
   - Add as Status type
   - Configure the 3 groups (To Do, In Progress, Complete)
   - Add the options to each group as specified

### Step 3: Create Relation
1. In `E2E Test Database`, add a Relation property
2. Name it **カテゴリー**
3. Select `E2E Categories` as the related database
4. This will automatically create the reverse relation in the Categories database

### Step 4: Share with Integration
1. Open each database
2. Click "Share" button
3. Invite your integration
4. Ensure it has full access

### Step 5: Get Database IDs (Optional)
If needed, you can get the database IDs:
1. Open each database in Notion
2. Copy the ID from the URL: `https://www.notion.so/{workspace}/{database-id}?v=...`
3. The database ID is the 32-character string (may include hyphens)

## Validation

After creating the databases, the E2E test setup will:
1. Find the databases by name
2. Validate all required properties exist
3. Check property types match expectations
4. Report any missing or incorrect properties

## Common Issues

### "Database not found"
- Ensure database names exactly match: `E2E Test Database` and `E2E Categories`
- Verify the databases are shared with your integration
- Check that the parent page is also shared with the integration

### "Missing property: ステータス"
- The Status property must be created manually in the Notion UI
- It cannot be created via API due to Notion limitations
- Make sure it's named exactly **ステータス**

### "Property has wrong type"
- Double-check the property type matches the table above
- Delete and recreate the property if needed
- For relations, ensure they're properly linked between databases

## Notes

- Database and property names are case-sensitive
- Japanese property names must match exactly (including kanji/kana)
- The Status property is critical and must be configured correctly
- Test data will be automatically populated and cleaned up by the test suite
- Manual database creation is a one-time setup; they can be reused across test runs