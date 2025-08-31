export default `
WITH family_members AS (
    SELECT 
        u.id::text AS member_id, 
        u.first_name, 
        u.last_name,
        u.family_id
    FROM users u
    WHERE u.family_id = (SELECT family_id FROM users WHERE id = $1)
    OR u.id = $1
),
-- Все книги во владении каждого члена семьи
member_owned_books AS (
    SELECT 
        fm.member_id,
        COUNT(DISTINCT o.book_id) AS total_books_owned
    FROM family_members fm
    LEFT JOIN owners o ON o.user_id = fm.member_id
    GROUP BY fm.member_id
),
-- Все прочитанные книги каждого члена семьи
member_read_books AS (
    SELECT 
        fm.member_id,
        COUNT(DISTINCT r.book_id) AS total_books_read
    FROM family_members fm
    LEFT JOIN readers r ON r.user_id = fm.member_id
    GROUP BY fm.member_id
)
SELECT 
    fm.member_id,
    fm.first_name,
    fm.last_name,
    COALESCE(mob.total_books_owned, 0) AS books_owned_count,
    COALESCE(mrb.total_books_read, 0) AS books_read_count,
    CASE 
        WHEN COALESCE(mob.total_books_owned, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(mrb.total_books_read, 0)::DECIMAL / mob.total_books_owned::DECIMAL) * 100, 2)
    END AS read_percentage
FROM family_members fm
LEFT JOIN member_owned_books mob ON fm.member_id = mob.member_id
LEFT JOIN member_read_books mrb ON fm.member_id = mrb.member_id
ORDER BY fm.first_name, fm.last_name;
`;
