import { Request, Response } from "express";
import pool from "../db";
import IAuthorDto from "../interfaces/mailib/dto/IAuthorDto";

const addAuthor = async (author: IAuthorDto) => {
  await pool.query(
    "INSERT INTO authors(id, fantlab_id, name, country) values($1, $2, $3, $4)",
    [author.id, author.fantlab_id, author.name, author.country]
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

const getAutorsByName = async (name: string) => {
  const { rows } = await pool.query<IAuthorDto>(
    "SELECT * FROM authors WHERE name ILIKE $1;",
    [`${name}%`]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getAutorsByBookId = async (bookId: string) => {
  const { rows } = await pool.query<IAuthorDto>(
    "SELECT a.* FROM authors a LEFT JOIN authors_books ab  ON ab.author_id = a.id WHERE ab.book_id = $1",
    [bookId]
  );
  return rows.length > 0 ? rows : null;
};

const getAllAutors = async (req: Request, res: Response) => {
  const { rows } = await pool.query<IAuthorDto>("SELECT * FROM authors ", []);

  res.json(rows);
};

export {
  addAuthor,
  getAuthorById,
  getAuthorByFantlabId,
  getAutorsByName,
  getAllAutors,
  getAutorsByBookId,
};
export default { getAllAutors };
