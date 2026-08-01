const { v4: uuidv4 } = require('uuid');
const { run, get } = require('../db/database');
const { invalidateLegacyMap } = require('./publicImageUrl');

/**
 * Record one rewrite. Caller must already be inside a transaction if needed.
 * old_ref may be a full base64 data URL (LONGTEXT).
 */
async function journalMigration({
  tableName,
  rowId,
  columnName,
  arrayIndex = null,
  oldRef,
  newRef,
  sha256,
}) {
  await run(
    `INSERT INTO media_migrations
      (id, table_name, row_id, column_name, array_index, old_ref, new_ref, sha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      tableName,
      String(rowId),
      columnName,
      arrayIndex,
      String(oldRef),
      String(newRef),
      String(sha256),
    ]
  );
  invalidateLegacyMap();
}

async function findExistingBySha(sha256) {
  return get(
    `SELECT new_ref FROM media_migrations
     WHERE sha256 = ? AND reverted_at IS NULL
     ORDER BY created_at ASC LIMIT 1`,
    [sha256]
  );
}

module.exports = { journalMigration, findExistingBySha };
