export default `WITH family_members AS (
    SELECT u.id::text AS member_id, u.first_name, u.last_name
    FROM users u
    WHERE u.family_id = (SELECT family_id FROM users WHERE id = $1)
    OR u.id = $1
),
-- Все книги семьи (всех типов) с учетом связи по id ИЛИ fantlab_id
family_books AS (
    SELECT DISTINCT b.id, b.name, b.fantlab_id, b.type
    FROM books b
    JOIN owners o ON (b.id = o.book_id OR b.fantlab_id = o.book_id)
    JOIN family_members fm ON o.user_id = fm.member_id
),
-- Все чтения с правильными связями
all_readings AS (
    SELECT 
        r.id AS reading_id,
        r.book_id,
        r.user_id,
        r.created_at,
        fb.id AS original_book_id
    FROM readers r
    JOIN family_members fm ON r.user_id = fm.member_id
    JOIN family_books fb ON (
        -- Для fantlab-книг связь по fantlab_id
        (fb.type IN ('fantlab_work', 'fantlab_edition') AND r.book_id = fb.fantlab_id)
        OR
        -- Для остальных книг связь по id
        (fb.type NOT IN ('fantlab_work', 'fantlab_edition') AND r.book_id = fb.id)
    )
)
SELECT 
    fb.id,
    fb.name,
    fb.type,
    fb.fantlab_id,
    COUNT(DISTINCT ar.user_id) AS read_count,
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'reader_id', ar.user_id,
                'reader_name', fm.first_name || ' ' || fm.last_name,
                'read_date', ar.created_at
            )
        )
        FROM (
            SELECT DISTINCT ON (user_id) 
                user_id, 
                created_at
            FROM all_readings 
            WHERE original_book_id = fb.id
            ORDER BY user_id, created_at DESC
        ) ar
        JOIN family_members fm ON ar.user_id = fm.member_id),
        '[]'::json
    ) AS readers_info,
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
LEFT JOIN all_readings ar ON ar.original_book_id = fb.id
GROUP BY fb.id, fb.name, fb.fantlab_id, fb.type
ORDER BY fb.name;
`;
