import { Request, Response } from "express";
import { v4 as uuid, validate as uuidValidate } from "uuid";
import { groupBy } from "lodash";

import { FANTLAB_GET_BOOK, FANTLAB_SEARCH_MAIN } from "../consts/fantlabUrls";
import { IFantlabSearchResponse } from "../interfaces/fantlab/IFantlabSearchResponse";
import pool from "../db";
import IBookDto from "../interfaces/mailib/dto/IBookDto";
import { IFantlabGetBookResponse } from "../interfaces/fantlab/IFantlabGetBookResponse";
import { FantlabSearchTypeEnum } from "../enums/fantlabSearchTypeEnum";
import { addAuthor, getAuthorByFantlabId } from "./authorController";
import IBookEntity from "../interfaces/mailib/entity/IBookEntity";
import { IFantlabGenre } from "../interfaces/fantlab/IFantlabGenre";
import { flatGenres } from "../utils/flatGenres";
import { addGenres, getGenresByFantlabId } from "./genreController";
import IGenreDto from "../interfaces/mailib/dto/IGenreDto";
import IAuthorDto from "../interfaces/mailib/dto/IAuthorDto";
import getBookDetailsSql from "../sql/getBookDetailsSql";
import getUserLibrarySql from "../sql/getUserLibrarySql";
import { IFantlabWork } from "../interfaces/fantlab/IFantlabWork";
import { addCycle, getCycleByFantlabId } from "./cycleController";
import { IFantlabCycle } from "../interfaces/fantlab/IFantlabCycle";
import ICycleDto from "../interfaces/mailib/dto/ICycleDto";
import { checkPostParams } from "../utils/checkPostParams";
import { addOwner, removeOwnerByBookIdAndUserId } from "./ownerController";
import { addReader, removeReaderByBookIdAndUserId } from "./readerController";
import { getUserInSession } from "../utils/getUserInSession";
import getFamilyUsersIdWhoDoesntHaveBook from "../sql/getFamilyUsersIdWhoDoesntHaveBook";

const search = async (req: Request<{ q?: string }, {}, {}>, res: Response) => {
  const { q } = req.query;

  const isWorks = (
    obj: IFantlabSearchResponse<
      FantlabSearchTypeEnum.AUTHORS | FantlabSearchTypeEnum.WORKS
    >
  ): obj is IFantlabSearchResponse<FantlabSearchTypeEnum.WORKS> => {
    return obj.type === FantlabSearchTypeEnum.WORKS;
  };

  try {
    const response = await fetch(`${FANTLAB_SEARCH_MAIN}?q=` + q);
    const data: Array<
      IFantlabSearchResponse<
        FantlabSearchTypeEnum.AUTHORS | FantlabSearchTypeEnum.WORKS
      >
    > = await response.json();

    // 1, 3, 8, 13, 17, 41, 42, 43, - id типов, которые пропускаем
    // взято из https://api.fantlab.ru/config.json

    const books: IBookEntity[] = [];
    const worksGroup = data.find(isWorks);

    if (worksGroup?.matches?.length) {
      worksGroup.matches
        .filter((i) => [1, 3, 8, 13, 17, 41, 42, 43].includes(i.work_type_id))
        .map((work) => {
          const authors: IAuthorDto[] = [];

          for (let i = 1; i <= 5; i += 1) {
            const keyId = `autor${i}_id` as keyof IFantlabWork;
            const keyName = `autor${i}_rusname` as keyof IFantlabWork;
            const id = work[keyId] as number;
            const name = work[keyName] as string;

            if (id && name) {
              authors.push({
                id: id.toString(),
                fantlab_id: id,
                name,
              });
            }
          }

          books.push({
            id: undefined,
            fantlab_id: work.work_id,
            name: work.rusname,
            description: "",
            image_big: "",
            image_small: work.pic_edition_id_auto
              ? `https://fantlab.ru/images/editions/small/${work.pic_edition_id_auto}`
              : "",
            authors,
            genres: [
              {
                id: "",
                name: work.name_show_im,
              },
            ],
            cycles: [],
            is_own_by_user: false,
            is_read_by_user: false,
          });
        });
    }

    res.json(books);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const addBookFromOurDb = async (book: IBookDto) => {
  return await pool.query(
    "INSERT INTO books(id, name, description, image_big, image_small, isbn_list, fantlab_id) values($1, $2, $3, $4, $5, $6, $7)",
    [
      book.id,
      book.name,
      book.description,
      book.image_big,
      book.image_small,
      book.isbn_list,
      book.fantlab_id,
    ]
  );
};

const convertBookDtoToBookEntity = (rows: any[]) => {
  const genres: IGenreDto[] = [];

  Object.values(groupBy(rows, "genre_id")).map((item) => {
    if (item.length) {
      genres.push({
        id: item[0].genre_id,
        name: item[0].genre_name,
      });
    }
  });

  const authors: IAuthorDto[] = [];

  Object.values(groupBy(rows, "author_id")).map((item) => {
    if (item.length) {
      authors.push({
        id: item[0].author_id,
        name: item[0].author_name,
      });
    }
  });

  const cycles: ICycleDto[] = [];

  Object.values(groupBy(rows, "cycle_id")).map((item) => {
    if (item.length) {
      cycles.push({
        id: item[0].cycle_id,
        name: item[0].cycle_name,
      });
    }
  });

  const newBookEntity: IBookEntity = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    image_big: rows[0].image_big,
    image_small: rows[0].image_small,
    isbn_list: rows[0].isbn_list,
    fantlab_id: rows[0].fantlab_id,
    authors,
    genres,
    cycles,
    is_own_by_user: rows[0].is_own_by_user,
    is_read_by_user: rows[0].is_read_by_user,
  };

  return newBookEntity;
};

const getBookFromOurDbById = async (id: string, userId: string) => {
  const { rows } = await pool.query(`${getBookDetailsSql} b.id = $1`, [
    id,
    userId,
  ]);

  if (rows.length === 0) return null;

  return convertBookDtoToBookEntity(rows);
};

const getBookFromOurDbByFantlabId = async (
  fantlabId: string,
  userId: string
) => {
  const { rows } = await pool.query(`${getBookDetailsSql} b.fantlab_id = $1`, [
    fantlabId,
    userId,
  ]);

  if (rows.length === 0) return null;

  return convertBookDtoToBookEntity(rows);
};

const getBookFromFantlab = async (id: string) => {
  try {
    const response = await fetch(FANTLAB_GET_BOOK(id));
    const data: IFantlabGetBookResponse = await response.json();

    const newBook: IBookDto = {
      id: uuid(),
      fantlab_id: data.work_id.toString(),
      name: data.work_name,
      description: data.work_description,
      image_small: data.image_preview,
      image_big: data.image,
      isbn_list: data.editions_info?.isbn_list,
    };

    await addBookFromOurDb(newBook);

    const newBookEntity: IBookEntity = {
      ...newBook,
      authors: [],
      genres: [],
      cycles: [],
      is_own_by_user: false,
      is_read_by_user: false,
    };

    newBookEntity.authors = await Promise.all(
      data.authors.map((author) => checkAndSaveAuthor(author, newBook))
    );

    const genresGroup = data.classificatory.genre_group.find(
      (i) => i.label.toUpperCase().indexOf("ЖАНР") > -1
    );

    if (genresGroup) {
      newBookEntity.genres = await Promise.all(
        flatGenres(genresGroup.genre).map((genre) =>
          checkAndSaveGenre(genre, newBook)
        )
      );
    }

    newBookEntity.cycles = await Promise.all(
      data.work_root_saga.map((cycle) => checkAndSaveCycle(cycle, newBook))
    );

    return newBookEntity;
  } catch (e) {
    return null;
  }
};

const checkAndSaveAuthor = async (
  author: { id: number; name: string },
  book: IBookDto
) => {
  let authorFromDb = await getAuthorByFantlabId(author.id);

  if (!authorFromDb) {
    authorFromDb = {
      id: uuid(),
      fantlab_id: author.id,
      name: author.name,
    };

    await addAuthor(authorFromDb);
  }

  await pool.query(
    "INSERT INTO authors_books(id, author_id, book_id) values($1, $2, $3)",
    [uuid(), authorFromDb.id, book.id]
  );

  return authorFromDb;
};

const checkAndSaveGenre = async (genre: IFantlabGenre, book: IBookDto) => {
  let genreFromDb = await getGenresByFantlabId(genre.genre_id);

  if (!genreFromDb) {
    genreFromDb = {
      id: uuid(),
      fantlab_id: genre.genre_id,
      name: genre.label,
    };

    await addGenres(genreFromDb);
  }

  await pool.query(
    "INSERT INTO genres_books(id, genre_id, book_id) values($1, $2, $3)",
    [uuid(), genreFromDb.id, book.id]
  );

  return genreFromDb;
};

const checkAndSaveCycle = async (cycle: IFantlabCycle, book: IBookDto) => {
  let cycleFromDb = await getCycleByFantlabId(cycle.work_id);

  if (!cycleFromDb) {
    cycleFromDb = {
      id: uuid(),
      name: cycle.work_name,
    };

    await addCycle(cycleFromDb);
  }

  await pool.query(
    "INSERT INTO cycles_books(id, cycle_id, book_id) values($1, $2, $3)",
    [uuid(), cycleFromDb.id, book.id]
  );

  return cycleFromDb;
};

const getBookById = async (id: string, userId: string) => {
  let book: IBookEntity | null = null;

  if (uuidValidate(id)) {
    book = await getBookFromOurDbById(id, userId);
  } else {
    book = await getBookFromOurDbByFantlabId(id, userId);

    if (!book) {
      book = await getBookFromFantlab(id);
    }
  }

  return book;
};

const getBookByIdRequest = async (
  req: Request<{ id: string }, {}, {}>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const user = getUserInSession(req, res);

    const book = await getBookById(id, user.id);

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const addBookInLibrary = async (
  req: Request<
    { id: string },
    {},
    { owner_ids: string[]; reader_ids?: string[] }
  >,
  res: Response
) => {
  if (!checkPostParams(req, ["book_id", "owner_ids", "reader_ids"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { owner_ids, reader_ids } = req.body;
  const { id } = req.params;

  try {
    // Пробегаемся по миссиву пользовтелей, которым надо добавить эту книгу во владение
    await Promise.all(
      owner_ids.map((user_id) => addOwner({ id: uuid(), book_id: id, user_id }))
    );

    // Если есть массив прочитавших, то побегаемся по миссиву id, которым надо добавить эту книгу в прочитанное
    if (reader_ids) {
      await Promise.all(
        reader_ids.map((user_id) =>
          addReader({ id: uuid(), book_id: id, user_id })
        )
      );
    }

    res.json({ message: "Book was added" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const removeBookFromLibrary = async (
  req: Request<{ id: string }, {}, { owner_ids: string[] }>,
  res: Response
) => {
  if (!checkPostParams(req, ["book_id", "owner_ids"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { owner_ids } = req.body;
  const { id } = req.params;

  const user = getUserInSession(req, res);
  const book = await getBookById(id, user.id);

  try {
    await removeOwnerByBookIdAndUserId(id, book?.fantlab_id || "", owner_ids);
    await removeReaderByBookIdAndUserId(id, book?.fantlab_id || "", owner_ids);

    res.json({ message: "Book was deleted" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getUserLibrary = async (req: Request<{}, {}, {}>, res: Response) => {
  const user = getUserInSession(req, res);

  const { rows } = await pool.query(getUserLibrarySql, [user.id]);

  res.json(rows);
};

const getUsersIdWhoDoesntHaveBook = async (
  req: Request<{ id: string }, {}, {}>,
  res: Response
) => {
  const { id } = req.params;
  const user = getUserInSession(req, res);
  const book = await getBookById(id, user.id);

  const { rows } = await pool.query(getFamilyUsersIdWhoDoesntHaveBook, [
    user.family_id,
    book?.id,
    book?.fantlab_id,
  ]);

  res.json(rows.map((i) => i.user_id));
};

export default {
  search,
  getBookByIdRequest,
  addBookInLibrary,
  removeBookFromLibrary,
  getUserLibrary,
  getUsersIdWhoDoesntHaveBook,
};
