export default `SELECT u.id AS user_id
FROM users u
WHERE u.family_id = $1  -- ID конкретной семьи
AND NOT EXISTS (
    SELECT 1
    FROM readers o
    JOIN books b ON (o.book_id = b.id OR o.book_id = b.fantlab_id)
    WHERE o.user_id = u.id
    AND (b.id = $2)
);`;
