export default `SELECT 
    b.*,
    g.id AS genre_id,
    g.name AS genre_name,
    a.id AS author_id,
    a.name AS author_name,
    c.id AS cycle_id,
    c.name AS cycle_name,
    CASE WHEN o.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_own_by_user,
    CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_read_by_user
FROM 
    books b
LEFT JOIN 
    genres_books gb ON b.id = gb.book_id
LEFT JOIN 
    genres g ON gb.genre_id = g.id
LEFT JOIN 
    authors_books ab ON b.id = ab.book_id
LEFT JOIN 
    authors a ON ab.author_id = a.id
LEFT JOIN 
    cycles_books cb ON b.id = cb.book_id
LEFT JOIN 
    cycles c ON cb.cycle_id = c.id
LEFT JOIN 
    owners o ON (o.book_id = b.id OR o.book_id = b.fantlab_id) AND o.user_id = $2
LEFT JOIN 
    readers r ON (r.book_id = b.id OR r.book_id = b.fantlab_id) AND r.user_id = $2
WHERE`;
