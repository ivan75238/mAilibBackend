import pool from "../db";
import IReaderDto from "../interfaces/mailib/dto/IReaderDto";

const addReader = async (reader: IReaderDto) => {
  await pool.query(
    `INSERT INTO readers(id, book_id, user_id)
     SELECT $1, $2, $3 
     WHERE NOT EXISTS (
        SELECT 1 
        FROM readers 
        WHERE book_id = $2 AND user_id = $3
    )`,
    [reader.id, reader.book_id, reader.user_id]
  );
};

const getReadersByBookIdAndUserId = async (bookId: string, userId: string) => {
  const { rows } = await pool.query<IReaderDto>(
    "SELECT id FROM readers WHERE book_id=$1 AND user_id=$2",
    [bookId, userId]
  );

  return rows;
};

const removeReaderByBookIdAndUserId = async (
  bookId: string,
  fantlabBookId: string,
  userIds: string[]
) => {
  await pool.query(
    "DELETE FROM readers WHERE book_id = (id = $1 OR id = $2) AND user_id = ANY($3)",
    [bookId, fantlabBookId, userIds]
  );
};

export {
  addReader,
  getReadersByBookIdAndUserId,
  removeReaderByBookIdAndUserId,
};
