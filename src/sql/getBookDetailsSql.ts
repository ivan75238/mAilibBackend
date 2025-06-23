export default `SELECT 
        b.*,
        g.id AS genre_id,
        g.name AS genre_name,
        a.id AS author_id,
        a.name AS author_name,
        c.id AS cycle_id,
        c.name AS cycle_name
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
    WHERE`;
