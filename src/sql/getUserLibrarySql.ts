export default `WITH family_members AS (
    SELECT u.id::text AS member_id, 
           u.first_name, 
           u.last_name
    FROM users u
    WHERE u.family_id = (SELECT family_id FROM users WHERE id = $1)
    OR u.id = $1
),
family_books AS (
    SELECT DISTINCT b.id, b.name, b.fantlab_id
    FROM books b
    JOIN owners o ON b.id = o.book_id OR b.fantlab_id = o.book_id
    JOIN family_members fm ON o.user_id = fm.member_id
),
-- Все возможные связи книг (по id и fantlab_id)
book_connections AS (
    SELECT id AS book_id, id AS original_book_id, fantlab_id FROM books
    UNION
    SELECT fantlab_id AS book_id, id AS original_book_id, fantlab_id FROM books WHERE fantlab_id IS NOT NULL
),
-- Все чтения членов семьи
all_readings AS (
    SELECT 
        r.book_id,
        r.user_id,
        r.created_at,
        bc.original_book_id,
        bc.fantlab_id
    FROM readers r
    JOIN book_connections bc ON r.book_id = bc.book_id
    JOIN family_members fm ON r.user_id = fm.member_id
)
SELECT 
    fb.id,
    fb.name,
    fb.fantlab_id,
    COUNT(DISTINCT ar.user_id) AS read_count,
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'reader_id', ar.user_id,
                'reader_name', fm.first_name || ' ' || fm.last_name,
                'read_date', ar.created_at
            ) ORDER BY ar.created_at DESC
        )
        FROM all_readings ar
        JOIN family_members fm ON ar.user_id = fm.member_id
        WHERE ar.original_book_id = fb.id OR ar.fantlab_id = fb.fantlab_id),
        '[]'::json
    ) AS readers_info,
    -- Информация об авторах
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'author_id', a.id,
                'author_name', a.name,
                'country', a.country,
                'fantlab_id', a.fantlab_id
            )
        )
        FROM authors_books ab
        JOIN authors a ON ab.author_id = a.id
        WHERE ab.book_id = fb.id),
        '[]'::json
    ) AS authors_info,
    -- Информация о жанрах
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'genre_id', g.id,
                'genre_name', g.name,
                'fantlab_id', g.fantlab_id
            )
        )
        FROM genres_books gb
        JOIN genres g ON gb.genre_id = g.id
        WHERE gb.book_id = fb.id),
        '[]'::json
    ) AS genres_info
FROM family_books fb
LEFT JOIN all_readings ar ON (ar.original_book_id = fb.id OR ar.fantlab_id = fb.fantlab_id)
GROUP BY fb.id, fb.name, fb.fantlab_id
ORDER BY fb.name;`;
