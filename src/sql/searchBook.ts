const searchBook = `
SELECT *, 
   ts_rank(to_tsvector('russian', name), plainto_tsquery('russian', $1)) AS relevance
   FROM books 
   WHERE name = $1 OR 
         to_tsvector('russian', name) @@ plainto_tsquery('russian', $1)
   ORDER BY relevance DESC;`;

export default searchBook;
