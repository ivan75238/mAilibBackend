const searchBook = `
SELECT *, 
   ts_rank(to_tsvector('english', name), plainto_tsquery('english', $1)) AS relevance
   FROM books 
   WHERE $1 = '' OR 
         to_tsvector('english', name) @@ plainto_tsquery('english', $1)
   ORDER BY relevance DESC;`;

export default searchBook;
