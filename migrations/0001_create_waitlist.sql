-- The sign-ups of the waitlist block: one row for each address. The address is unique without
-- regard to case, so a repeat sign-up changes nothing.
CREATE TABLE waitlist (
	id INTEGER PRIMARY KEY,
	email TEXT NOT NULL UNIQUE COLLATE NOCASE,
	source_path TEXT NOT NULL,
	created_at TEXT NOT NULL
);
