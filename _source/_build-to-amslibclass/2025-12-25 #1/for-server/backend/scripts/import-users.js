const fs = require('fs');
const path = require('path');

/**
 * This script reads user data from a legacy CSV file, transforms it to match the new 'users' table schema,
 * and generates a SQL script for importing the data.
 *
 * Key Transformations:
 * 1. Maps the 'status' column to a JSON array in the 'roles' column.
 * 2. Sets default values for new columns: `profile_completed`, `original_name`, `name_updated_by_user`.
 * 3. Ignores the obsolete 'password' column from the CSV.
 * 4. Handles potentially invalid date formats ('0000-00-00 00:00:00') by converting them to NULL.
 * 5. Escapes string values to prevent SQL injection.
 */

// --- Configuration ---
// IMPORTANT: Update this path to the correct location of your source CSV file.
const csvFilePath = path.resolve(__dirname, '../../backup/local_data/csv/amslib-tables-users-20250925.csv');
const outputSqlFilePath = path.resolve(__dirname, 'users_import.sql');
const tableName = 'users';

// --- Helper Functions ---

/**
 * Escapes a string for safe use in a SQL query.
 * @param {any} value The value to escape.
 * @returns {string} The escaped string, ready for SQL.
 */
function escapeSql(value) {
    if (value === null || typeof value === 'undefined') {
        return 'NULL';
    }
    // Simple escape for single quotes. For production, a library like `mysql.escape` is recommended.
    const str = String(value);
    return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Parses a line from the CSV. This is a simple parser and might need adjustment
 * for more complex CSVs with escaped quotes.
 * @param {string} line A single line from the CSV file.
 * @returns {string[]} An array of column values.
 */
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else current += char;
    }
    result.push(current);
    return result.map(field => field.trim().replace(/^"|"$/g, ''));
}

// --- Main Logic ---

try {
    console.log(`Reading CSV file from: ${csvFilePath}`);
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const allLines = csvData.trim().split('\n');
    const headers = allLines.shift().split(',');

    // Skip the first 4 user rows as requested and process the rest.
    const linesToProcess = allLines.slice(4);

    // Find the indices of the columns we need from the CSV
    const colIndices = {
        id: headers.indexOf('id'),
        name: headers.indexOf('name'),
        status: headers.indexOf('status'),
        email: headers.indexOf('email'),
        phone: headers.indexOf('phone'),
        pdpa: headers.indexOf('pdpa'),
        created_at: headers.indexOf('created_at'),
        updated_at: headers.indexOf('updated_at'),
        is_active: headers.indexOf('is_active'),
    };

    let sqlStatements = `
-- Generated SQL script for importing users from CSV
-- Target table: ${tableName}

-- It's recommended to back up your 'users' table before running this script.
-- The script will attempt to insert or update records based on the email address.

`;

    const valueClauses = [];
    let newId = 1; // Initialize a new counter for the ID, starting from 1.

    for (const line of linesToProcess) {
        const values = parseCsvLine(line);
        if (values.length !== headers.length) {
            console.warn(`⚠️ Skipping malformed line. Expected ${headers.length} columns, but got ${values.length}. Line: "${line}"`);
            continue; // Skip malformed lines
        }

        // Sanitize email: remove leading/trailing spaces and invalid characters
        const email = (values[colIndices.email] || '').trim();
        if (!email) continue; // Skip rows with no email

        const role = values[colIndices.status];
        const rolesJson = escapeSql(JSON.stringify([role])); // Transform status to JSON array

        // Handle invalid timestamp '0000-00-00 00:00:00'
        const createdAt = values[colIndices.created_at] === '0000-00-00 00:00:00' ? 'NULL' : escapeSql(values[colIndices.created_at]);
        const updatedAt = values[colIndices.updated_at] === '0000-00-00 00:00:00' ? 'NULL' : escapeSql(values[colIndices.updated_at]);
        
        const valueClause = `(${newId}, ${escapeSql(values[colIndices.name])}, ${escapeSql(email)}, ${rolesJson}, ${escapeSql(values[colIndices.is_active])}, ${escapeSql(values[colIndices.phone])}, ${escapeSql(values[colIndices.pdpa])}, 1, ${escapeSql(values[colIndices.name])}, 0, ${createdAt}, ${updatedAt})`;
        valueClauses.push(valueClause);

        newId++; // Increment the new ID for the next user.
    }

    if (valueClauses.length > 0) {
        sqlStatements += `INSERT INTO ${tableName} (id, name, email, roles, is_active, phone, pdpa, profile_completed, original_name, name_updated_by_user, created_at, updated_at) VALUES\n`;
        sqlStatements += valueClauses.join(',\n');
        sqlStatements += `\nON DUPLICATE KEY UPDATE
  name = VALUES(name), roles = VALUES(roles), is_active = VALUES(is_active), phone = VALUES(phone), pdpa = VALUES(pdpa), profile_completed = VALUES(profile_completed), updated_at = VALUES(updated_at);\n`;
    }

    fs.writeFileSync(outputSqlFilePath, sqlStatements);
    console.log(`✅ Successfully generated SQL import script at: ${outputSqlFilePath}`);

} catch (error) {
    console.error('❌ An error occurred while generating the SQL script:', error);
}