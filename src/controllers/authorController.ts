import pool from "../db";
import IAuthorDto from "../interfaces/mailib/dto/IAuthorDto";

const addAuthor = async (book: IAuthorDto) => {
  await pool.query(
    "INSERT INTO authors(id, fantlab_id, name, country) values($1, $2, $3, $4)",
    [book.id, book.fantlab_id, book.name, book.country]
  );
};

const getAuthorById = async (id: string) => {
  const { rows } = await pool.query<IAuthorDto>(
    "SELECT * FROM authors WHERE id=$1",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getAuthorByFantlabId = async (fantlabId: number) => {
  const { rows } = await pool.query<IAuthorDto>(
    "SELECT * FROM authors WHERE fantlab_id=$1",
    [fantlabId]
  );
  return rows.length > 0 ? rows[0] : null;
};

export { addAuthor, getAuthorById, getAuthorByFantlabId };
