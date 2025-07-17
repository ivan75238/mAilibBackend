export default `WITH family_members AS (
    SELECT u.id::text AS member_id, 
           u.first_name, 
           u.last_name
    FROM users u
    WHERE u.family_id = (SELECT family_id FROM users WHERE id = $1)
    OR u.id = $1
),
family_books AS (
    SELECT DISTINCT b.*
    FROM books b
    JOIN owners o ON b.id = o.book_id or b.fantlab_id = o.book_id
    JOIN family_members fm ON o.user_id = fm.member_id
)
SELECT 
    fb.id,
	fb.name,
	fb.fantlab_id,    
    COUNT(r.user_id) FILTER (WHERE r.user_id IS NOT NULL) AS read_count,
    json_agg(
        json_build_object(
            'reader_id', r.user_id,
            'reader_name', fm.first_name || ' ' || fm.last_name,
            'read_date', r.created_at
        ) ORDER BY r.created_at DESC
    ) AS readers_info
FROM family_books fb
LEFT JOIN readers r ON fb.id = r.book_id or fb.fantlab_id = r.book_id
LEFT JOIN family_members fm ON r.user_id = fm.member_id
GROUP BY fb.id, fb.name, fb.fantlab_id
ORDER BY fb.name`;
