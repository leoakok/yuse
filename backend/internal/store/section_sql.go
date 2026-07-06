package store

const sectionSelectSQL = `
	SELECT id, workspace_id, type, title, custom_key, description, created_by, created_at, updated_at
	FROM sections`
