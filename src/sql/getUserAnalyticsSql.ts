export default `
WITH user_info AS (
    SELECT 
        u.id::text AS member_id, 
        u.first_name, 
        u.last_name
    FROM users u
    WHERE u.id = $1
),
-- Все книги во владении пользователя
user_owned_books AS (
    SELECT 
        COUNT(DISTINCT o.book_id) AS total_books_owned
    FROM user_info ui
    LEFT JOIN owners o ON o.user_id = ui.member_id
),
-- Все прочитанные книги пользователя
user_read_books AS (
    SELECT 
        COUNT(DISTINCT r.book_id) AS total_books_read
    FROM user_info ui
    LEFT JOIN readers r ON r.user_id = ui.member_id
)
SELECT 
    ui.member_id,
    ui.first_name,
    ui.last_name,
    COALESCE(uob.total_books_owned, 0) AS books_owned_count,
    COALESCE(urb.total_books_read, 0) AS books_read_count,
    CASE 
        WHEN COALESCE(uob.total_books_owned, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(urb.total_books_read, 0)::DECIMAL / uob.total_books_owned::DECIMAL) * 100, 2)
    END AS read_percentage
FROM user_info ui
CROSS JOIN user_owned_books uob
CROSS JOIN user_read_books urb;
`;
