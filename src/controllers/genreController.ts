import pool from "../db";
import IGenreDto from "../interfaces/mailib/dto/IGenreDto";

const addGenres = async (book: IGenreDto) => {
  await pool.query(
    "INSERT INTO genres(id, fantlab_id, name) values($1, $2, $3)",
    [book.id, book.fantlab_id, book.name]
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

export { addGenres, getGenresById, getGenresByFantlabId };
