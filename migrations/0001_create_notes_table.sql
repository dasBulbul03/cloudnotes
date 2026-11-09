-- Migration: 0001_create_notes_table
-- CloudNotes initial schema
-- Uses TEXT for timestamps to maintain ISO 8601 strings across all environments

CREATE TABLE IF NOT EXISTS notes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    NOT NULL CHECK(length(title) > 0 AND length(title) <= 500),
    content   TEXT    NOT NULL CHECK(length(content) <= 100000),
    created_at TEXT   NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT   NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Index to accelerate full-text searches on title and content
CREATE INDEX IF NOT EXISTS idx_notes_title   ON notes (title);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updated_at DESC);
