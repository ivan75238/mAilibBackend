import { Request, Response } from "express";
import pool from "../db";
import IGenreDto from "../interfaces/mailib/dto/IGenreDto";

const addGenres = async (genre: IGenreDto) => {
  await pool.query(
    "INSERT INTO genres(id, fantlab_id, name) values($1, $2, $3)",
    [genre.id, genre.fantlab_id, genre.name]
  );
};

const getGenresById = async (id: string) => {
  const { rows } = await pool.query<IGenreDto>(
    "SELECT * FROM genres WHERE id=$1",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getGenresByFantlabId = async (fantlabId: number) => {
  const { rows } = await pool.query<IGenreDto>(
    "SELECT * FROM genres WHERE fantlab_id=$1",
    [fantlabId]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getGenresByName = async (name: string) => {
  const { rows } = await pool.query<IGenreDto>(
    "SELECT * FROM genres WHERE name ILIKE $1;",
    [`${name}%`]
  );
  return rows.length > 0 ? rows[0] : null;
};

const getAllGenres = async (req: Request, res: Response) => {
  const { rows } = await pool.query<IGenreDto>("SELECT * FROM genres ", []);

  res.json(rows);
};

export { addGenres, getGenresById, getGenresByFantlabId, getGenresByName };
export default { getAllGenres };
