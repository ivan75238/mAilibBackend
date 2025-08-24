import pool from "../db";
import IOwnerDto from "../interfaces/mailib/dto/IOwnerDto";

const addOwner = async (owner: IOwnerDto) => {
  await pool.query(
    `INSERT INTO owners(id, book_id, user_id, type)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (
        SELECT 1 
        FROM owners 
        WHERE book_id = $2 AND user_id = $3
    )`,
    [owner.id, owner.book_id, owner.user_id, owner.type]
  );
};

const getOwnersByBookIdAndUserId = async (bookId: string, userId: string) => {
  const { rows } = await pool.query<IOwnerDto>(
    "SELECT id FROM owners WHERE book_id=$1 AND user_id=$2",
    [bookId, userId]
  );

  return rows;
};

const removeOwnerByBookIdAndUserId = async (
  bookId: string,
  fantlabBookId: string,
  userIds: string[]
) => {
  await pool.query(
    "DELETE FROM owners WHERE (book_id = $1 OR book_id = $2) AND user_id = ANY($3)",
    [bookId, fantlabBookId, userIds]
  );
};

export { addOwner, getOwnersByBookIdAndUserId, removeOwnerByBookIdAndUserId };
