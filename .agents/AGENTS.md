# Agent Rules

## API Development
- **Database Schema Verification**: Before modifying or creating any API endpoints (PHP backend), always check and verify the related `.sql` schema files first (e.g., `init.sql`). This is critical to ensure compatibility with the database structure, especially since recent migrations from Node.js to PHP might have altered the codebase and database assumptions. Do not guess the column names.
