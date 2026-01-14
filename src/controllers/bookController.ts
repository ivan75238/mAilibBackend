import { Request, Response } from "express";
import { v4 as uuid, validate as uuidValidate } from "uuid";
import { groupBy } from "lodash";

import {
  FANTLAB_GET_EDITION,
  FANTLAB_GET_WORK,
  FANTLAB_SEARCH_EDITIONS,
  FANTLAB_SEARCH_WORKS,
} from "../consts/fantlabUrls";
import { IFantlabSearchResponse } from "../interfaces/fantlab/IFantlabSearchResponse";
import pool from "../db";
import IBookDto from "../interfaces/mailib/dto/IBookDto";
import { IFantlabGetWorkResponse } from "../interfaces/fantlab/IFantlabGetWorkResponse";
import { FantlabSearchTypeEnum } from "../enums/fantlabSearchTypeEnum";
import {
  addAuthor,
  getAuthorByFantlabId,
  getAutorsByBookId,
  getAutorsByName,
} from "./authorController";
import IBookEntity from "../interfaces/mailib/entity/IBookEntity";
import { IFantlabGenre } from "../interfaces/fantlab/IFantlabGenre";
import { flatGenres } from "../utils/flatGenres";
import {
  addGenres,
  getGenresByFantlabId,
  getGenresByName,
} from "./genreController";
import IGenreDto from "../interfaces/mailib/dto/IGenreDto";
import IAuthorDto from "../interfaces/mailib/dto/IAuthorDto";
import getBookDetailsSql from "../sql/getBookDetailsSql";
import getUserLibrarySql from "../sql/getUserLibrarySql";
import { IFantlabWork } from "../interfaces/fantlab/IFantlabWork";
import {
  addCycle,
  getCycleByFantlabId,
  getCycleByName,
} from "./cycleController";
import { IFantlabCycle } from "../interfaces/fantlab/IFantlabCycle";
import ICycleDto from "../interfaces/mailib/dto/ICycleDto";
import { checkPostParams } from "../utils/checkPostParams";
import { addOwner, removeOwnerByBookIdAndUserId } from "./ownerController";
import { addReader, removeReaderByBookIdAndUserId } from "./readerController";
import { getUserInSession } from "../utils/getUserInSession";
import getFamilyUsersIdWhoDoesntHaveBook from "../sql/getFamilyUsersIdWhoDoesntHaveBook";
import { parseBracketAutors } from "../utils/parseBracketAutor";
import { removeBracketsContent } from "../utils/removeBracketsContent";
import {
  IFantlabGetEditionResponse,
  Series,
} from "../interfaces/fantlab/IFantlabGetEditionResponse";
import getFamilyUsersIdWhoDoesntHaveInnerBook from "../sql/getFamilyUsersIdWhoDoesntHaveInnerBook";
import { IFantlabAuthor } from "../interfaces/fantlab/IFantlabAuthor";
import { IFantlabEdition } from "../interfaces/fantlab/IFantlabEdition";
import searchBook from "../sql/searchBook";
import { clearDescription } from "../utils/clearDescription";
import getFamilyUsersIdWhoDoesntReadInnerBook from "../sql/getFamilyUsersIdWhoDoesntReadInnerBook";
import getFamilyUsersIdWhoDoesntReadBook from "../sql/getFamilyUsersIdWhoDoesntReadBook";

interface ISearchResult {
  books: IBookEntity[];
  editions: IBookEntity[];
  inner: IBookEntity[];
}

const removeDuplicatesFromInner = (data: ISearchResult): ISearchResult => {
  // Собираем все fantlab_id из books и editions
  const existingIds = new Set<string | number | undefined>();

  data.books.forEach((item) => existingIds.add(item.fantlab_id));
  data.editions.forEach((item) => existingIds.add(item.fantlab_id));

  // Фильтруем inner, оставляя только те элементы, которых нет в других массивах
  data.inner = data.inner.filter((item) => !existingIds.has(item.fantlab_id));

  return data;
};

const search = async (req: Request<{ q?: string }, {}, {}>, res: Response) => {
  const { q } = req.query;

  const isWorks = (
    obj: IFantlabSearchResponse<
      | FantlabSearchTypeEnum.AUTHORS
      | FantlabSearchTypeEnum.WORKS
      | FantlabSearchTypeEnum.EDITIONS
    >
  ): obj is IFantlabSearchResponse<FantlabSearchTypeEnum.WORKS> => {
    return obj.type === FantlabSearchTypeEnum.WORKS;
  };

  const isEditions = (
    obj: IFantlabSearchResponse<
      | FantlabSearchTypeEnum.AUTHORS
      | FantlabSearchTypeEnum.WORKS
      | FantlabSearchTypeEnum.EDITIONS
    >
  ): obj is IFantlabSearchResponse<FantlabSearchTypeEnum.EDITIONS> => {
    return obj.type === FantlabSearchTypeEnum.EDITIONS;
  };

  try {
    const responseWorks = await fetch(
      `${FANTLAB_SEARCH_WORKS}?onlymatches=1&q=` + q
    );
    let worksData: Array<IFantlabWork> = await responseWorks.json();

    const books: IBookEntity[] = [];

    if (worksData?.length) {
      await Promise.all(
        worksData
          .filter((i) => [1, 3, 8, 13, 17, 41, 42, 43].includes(i.work_type_id))
          .map(async (work) => {
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

            const response = await fetch(
              FANTLAB_GET_WORK(work.work_id.toString())
            );
            const details: IFantlabGetWorkResponse = await response.json();

            books.push({
              id: undefined,
              fantlab_id: work.work_id,
              name: work.rusname,
              description: "",
              image_big: details.image,
              image_small: details.image_preview,
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
              type: "fantlab_work",
            });
          })
      );
    }

    const responseEditions = await fetch(
      `${FANTLAB_SEARCH_EDITIONS}?onlymatches=1&q=` + q
    );
    let editionsData: Array<IFantlabEdition> = await responseEditions.json();

    const editions: IBookEntity[] = [];

    if (editionsData?.length) {
      await Promise.all(
        editionsData.map(async (edition) => {
          const authors: IAuthorDto[] = parseBracketAutors(edition.autors);

          const response = await fetch(
            FANTLAB_GET_EDITION(edition.edition_id.toString())
          );
          const details: IFantlabGetEditionResponse = await response.json();

          editions.push({
            id: undefined,
            fantlab_id: edition.edition_id.toString(),
            name: removeBracketsContent(edition.name),
            description: "",
            image_big: details.image_preview,
            image_small: details.image,
            authors,
            genres: [],
            cycles: [],
            is_own_by_user: false,
            is_read_by_user: false,
            type: "fantlab_edition",
          });
        })
      );
    }

    const inner: IBookEntity[] = [];

    //Поиск в нашей библиотеке
    const { rows } = await pool.query<IBookDto>(searchBook, [q]);

    await Promise.all(
      rows.map(async (row) => {
        const authors = await getAutorsByBookId(row.id);
        inner.push({
          id: row.id,
          fantlab_id: row.fantlab_id,
          name: row.name,
          description: "",
          image_big: row.image_big,
          image_small: row.image_small,
          authors: authors || [],
          genres: [],
          cycles: [],
          is_own_by_user: false,
          is_read_by_user: false,
          type: row.type,
        });
      })
    );

    res.json(removeDuplicatesFromInner({ books, editions, inner }));
  } catch (error) {
    res.status(500).json({ error });
  }
};

const addBookFromOurDb = async (book: IBookDto) => {
  return await pool.query(
    "INSERT INTO books(id, name, description, image_big, image_small, isbn_list, fantlab_id, type) values($1, $2, $3, $4, $5, $6, $7, $8)",
    [
      book.id,
      book.name,
      book.description,
      book.image_big,
      book.image_small,
      book.isbn_list,
      book.fantlab_id,
      book.type,
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
    if (item.length && item[0].cycle_id && item[0].cycle_name) {
      cycles.push({
        id: item[0].cycle_id,
        name: item[0].cycle_name,
      });
    }
  });

  const newBookEntity: IBookEntity = {
    id: rows[0].id,
    name: rows[0].name,
    description: clearDescription(rows[0].description),
    image_big: rows[0].image_big,
    image_small: rows[0].image_small,
    isbn_list: rows[0].isbn_list,
    fantlab_id: rows[0].fantlab_id,
    authors,
    genres,
    cycles,
    is_own_by_user: rows[0].is_own_by_user,
    is_read_by_user: rows[0].is_read_by_user,
    type: rows[0].type,
  };

  return newBookEntity;
};

const getBookFromOurDbById = async (
  type: string,
  id: string,
  userId: string
) => {
  const { rows } = await pool.query(`${getBookDetailsSql} b.id = $1`, [
    id,
    userId,
    type,
  ]);

  if (rows.length === 0) return null;

  return convertBookDtoToBookEntity(rows);
};

const getBookFromOurDbByFantlabId = async (
  type: string,
  fantlabId: string,
  userId: string
) => {
  const { rows } = await pool.query(`${getBookDetailsSql} b.fantlab_id = $1`, [
    fantlabId,
    userId,
    type,
  ]);

  if (rows.length === 0) return null;

  return convertBookDtoToBookEntity(rows);
};

const getBookWorkFromFantlab = async (id: string) => {
  const response = await fetch(FANTLAB_GET_WORK(id));
  const data: IFantlabGetWorkResponse = await response.json();

  const newBook: IBookDto = {
    id: uuid(),
    fantlab_id: data.work_id.toString(),
    name: data.work_name,
    description: clearDescription(data.work_description),
    image_small: data.image_preview,
    image_big: data.image,
    isbn_list: data.editions_info?.isbn_list,
    type: "fantlab_work",
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

  try {
    newBookEntity.authors = await Promise.all(
      data.authors.map((author) => checkAndSaveAuthor(author, newBook))
    );
  } catch (e) {
    console.log("Error adding authors", e);
  }

  try {
    const genresGroup = data.classificatory?.genre_group?.find(
      (i) => i.label.toUpperCase().indexOf("ЖАНР") > -1
    );

    if (genresGroup) {
      newBookEntity.genres = await Promise.all(
        flatGenres(genresGroup.genre).map((genre) =>
          checkAndSaveGenre(genre, newBook)
        )
      );
    }
  } catch (e) {
    console.log("Error adding genres", e);
  }

  try {
    const cycles = data.work_root_saga.filter((i) => i.work_id);
    newBookEntity.cycles = await Promise.all(
      cycles.map((cycle) => checkAndSaveCycle(cycle, newBook))
    );
  } catch (e) {
    console.log("Error adding cycles", e);
  }

  return newBookEntity;
};

const getBookEditionFromFantlab = async (id: string) => {
  const response = await fetch(FANTLAB_GET_EDITION(id));
  const data: IFantlabGetEditionResponse = await response.json();

  const newBook: IBookDto = {
    id: uuid(),
    fantlab_id: data.edition_id.toString(),
    name: data.edition_name,
    description: clearDescription(data.description),
    image_small: data.image_preview,
    image_big: data.image,
    isbn_list: data.isbns.join(", "),
    type: "fantlab_edition",
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

  try {
    newBookEntity.authors = await Promise.all(
      data.creators.authors.map((author) => checkAndSaveAuthor(author, newBook))
    );
  } catch (e) {
    console.log("Error adding authors", e);
  }

  try {
    const cycles = data.series.filter((i) => i.id);
    newBookEntity.cycles = await Promise.all(
      cycles.map((cycle) => checkAndSaveSerie(cycle, newBook))
    );
  } catch (e) {
    console.log("Error adding cycles", e);
  }

  return newBookEntity;
};

const checkAndSaveAuthor = async (
  author: { id?: number; name: string },
  book: IBookDto
) => {
  let authorFromDb;
  if (author.id) {
    authorFromDb = await getAuthorByFantlabId(author.id);
  }

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
      fantlab_id: cycle.work_id,
      type: cycle.work_type,
    };

    await addCycle(cycleFromDb);
  }

  await pool.query(
    "INSERT INTO cycles_books(id, cycle_id, book_id) values($1, $2, $3)",
    [uuid(), cycleFromDb.id, book.id]
  );

  return cycleFromDb;
};

const checkAndSaveSerie = async (cycle: Series, book: IBookDto) => {
  let cycleFromDb = await getCycleByFantlabId(parseInt(cycle.id));

  if (!cycleFromDb) {
    cycleFromDb = {
      id: uuid(),
      name: cycle.name,
      fantlab_id: parseInt(cycle.id),
      type: cycle.type,
    };

    await addCycle(cycleFromDb);
  }

  await pool.query(
    "INSERT INTO cycles_books(id, cycle_id, book_id) values($1, $2, $3)",
    [uuid(), cycleFromDb.id, book.id]
  );

  return cycleFromDb;
};

const getBookById = async (type: string, id: string, userId: string) => {
  let book: IBookEntity | null = null;

  if (uuidValidate(id)) {
    book = await getBookFromOurDbById(type, id, userId);
  } else {
    book = await getBookFromOurDbByFantlabId(type, id, userId);
  }

  return book;
};

const getBookByIdWithAddingIfNotExist = async (
  id: string,
  type: string,
  userId: string
) => {
  let book: IBookEntity | null = null;

  if (uuidValidate(id)) {
    book = await getBookFromOurDbById(type, id, userId);
  } else {
    book = await getBookFromOurDbByFantlabId(type, id, userId);

    if (!book) {
      if (type === "fantlab_work") {
        book = await getBookWorkFromFantlab(id);
      } else if (type === "fantlab_edition") {
        book = await getBookEditionFromFantlab(id);
      }
    }
  }

  return book;
};

const getBookByIdRequest = async (
  req: Request<{ id: string; type: string }, {}, {}>,
  res: Response
) => {
  try {
    const { id, type } = req.params;
    const user = getUserInSession(req, res);

    const book = await getBookByIdWithAddingIfNotExist(id, type, user.id);

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const addBookInLibrary = async (
  req: Request<
    { id: string; type: string },
    {},
    { owner_ids: string[]; reader_ids?: string[] }
  >,
  res: Response
) => {
  if (!checkPostParams(req, ["book_id", "type", "owner_ids", "reader_ids"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { owner_ids, reader_ids } = req.body;
  const { id, type } = req.params;

  try {
    // Пробегаемся по миссиву пользовтелей, которым надо добавить эту книгу во владение
    await Promise.all(
      owner_ids.map((user_id) =>
        addOwner({ id: uuid(), book_id: id, user_id, type })
      )
    );

    // Если есть массив прочитавших, то побегаемся по миссиву id, которым надо добавить эту книгу в прочитанное
    if (reader_ids) {
      await Promise.all(
        reader_ids.map((user_id) =>
          addReader({ id: uuid(), book_id: id, user_id, type })
        )
      );
    }

    res.json({ message: "Book was added" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const markAsRead = async (
  req: Request<{ id: string; type: string }, {}, { reader_ids: string[] }>,
  res: Response
) => {
  if (!checkPostParams(req, ["book_id", "type", "reader_ids"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { reader_ids } = req.body;
  const { id, type } = req.params;

  try {
    await Promise.all(
      reader_ids.map((user_id) =>
        addReader({ id: uuid(), book_id: id, user_id, type })
      )
    );

    res.json({ message: "Book was marked" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const removeMark = async (
  req: Request<{ id: string; type: string }, {}, { reader_ids: string[] }>,
  res: Response
) => {
  if (!checkPostParams(req, ["id", "type", "reader_ids"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { reader_ids } = req.body;
  const { id, type } = req.params;

  const user = getUserInSession(req, res);
  const book = await getBookById(type, id, user.id);

  try {
    await removeReaderByBookIdAndUserId(id, book?.fantlab_id || "", reader_ids);

    res.json({ message: "Book was unmarked" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const removeBookFromLibrary = async (
  req: Request<{ id: string; type: string }, {}, { owner_ids: string[] }>,
  res: Response
) => {
  if (!checkPostParams(req, ["id", "type", "owner_ids"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { owner_ids } = req.body;
  const { id, type } = req.params;

  const user = getUserInSession(req, res);
  const book = await getBookById(type, id, user.id);

  try {
    await removeReaderByBookIdAndUserId(id, book?.fantlab_id || "", owner_ids);
    await removeOwnerByBookIdAndUserId(id, book?.fantlab_id || "", owner_ids);

    res.json({ message: "Book was deleted" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getUserLibrary = async (
  req: Request<
    { page?: string; limit?: string; sortBy?: string; sortOrder?: string },
    {},
    {}
  >,
  res: Response
) => {
  const user = getUserInSession(req, res);

  // Параметры пагинации и сортировки
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as string) || "name";
  const sortOrder = (req.query.sortOrder as string) || "ASC";

  const offset = (page - 1) * limit;

  // Валидация параметров сортировки
  const validSortColumns = [
    "name",
    "authors_info",
    "genres_info",
    "read_count",
  ];
  const validSortOrders = ["ASC", "DESC"];

  const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : "name";
  const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
    ? sortOrder.toUpperCase()
    : "ASC";

  // Определяем, используется ли пагинация
  const usePagination =
    req.query.page !== undefined || req.query.limit !== undefined;

  try {
    // Убираем точку с запятой из исходного SQL
    let baseSql = getUserLibrarySql.trim();
    if (baseSql.endsWith(";")) {
      baseSql = baseSql.slice(0, -1);
    }

    // Оборачиваем исходный запрос во внешний SELECT чтобы иметь доступ ко всем полям
    let wrappedSql = `SELECT * FROM (${baseSql}) as library_data`;

    // Добавляем ORDER BY к обернутому запросу
    let orderByClause;
    switch (finalSortBy) {
      case "authors_info":
        // Упрощенная сортировка по авторам - берем первого автора или пустую строку
        orderByClause = `(
          COALESCE(
            (SELECT (authors_info->0->>'author_name') 
             FROM (SELECT authors_info) AS a 
             WHERE authors_info::text != '[]'), 
            ''
          )
        ) ${finalSortOrder}`;
        break;
      case "genres_info":
        // Упрощенная сортировка по жанрам - берем первый жанр или пустую строку
        orderByClause = `(
          COALESCE(
            (SELECT (genres_info->0->>'genre_name') 
             FROM (SELECT genres_info) AS g 
             WHERE genres_info::text != '[]'), 
            ''
          )
        ) ${finalSortOrder}`;
        break;
      case "read_count":
        orderByClause = `read_count ${finalSortOrder}`;
        break;
      default: // 'name'
        orderByClause = `name ${finalSortOrder}`;
    }

    wrappedSql += ` ORDER BY ${orderByClause}`;

    let dataResult;
    let totalCount = 0;

    if (usePagination) {
      // Добавляем пагинацию к обернутому запросу
      const paginatedSql = `${wrappedSql} LIMIT $2 OFFSET $3`;

      // Запрос для получения общего количества
      const countQuery = `
        WITH family_members AS (
          SELECT u.id::text AS member_id
          FROM users u
          WHERE u.family_id = (SELECT family_id FROM users WHERE id = $1)
          OR u.id = $1
        ),
        family_books AS (
          SELECT DISTINCT b.id
          FROM books b
          JOIN owners o ON (b.id = o.book_id OR b.fantlab_id = o.book_id)
          JOIN family_members fm ON o.user_id = fm.member_id
        )
        SELECT COUNT(*) as total_count
        FROM family_books
      `;

      // Выполняем оба запроса параллельно
      const [data, countResult] = await Promise.all([
        pool.query(paginatedSql, [user.id, limit, offset]),
        pool.query(countQuery, [user.id]),
      ]);

      dataResult = data;
      totalCount = parseInt(countResult.rows[0].total_count);
    } else {
      // Без пагинации
      const finalSql = `${wrappedSql};`;
      dataResult = await pool.query(finalSql, [user.id]);
    }

    const totalPages = Math.ceil(totalCount / limit);

    // Возвращаем данные в зависимости от наличия параметров пагинации
    if (usePagination) {
      res.json({
        data: dataResult.rows,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: totalCount,
          items_per_page: limit,
          has_previous: page > 1,
          has_next: page < totalPages,
        },
        sort: {
          by: finalSortBy,
          order: finalSortOrder,
        },
      });
    } else {
      // Без пагинации - возвращаем исходный формат
      res.json(dataResult.rows);
    }
  } catch (error) {
    console.error("Error fetching user library:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUsersIdWhoDoesntHaveBook = async (
  req: Request<{ id: string; type: string }, {}, {}>,
  res: Response
) => {
  const { id, type } = req.params;
  const user = getUserInSession(req, res);
  const book = await getBookById(type, id, user.id);

  const array =
    type === "inner_db_work"
      ? [user.family_id, book?.id]
      : [user.family_id, book?.id, book?.fantlab_id];

  const { rows } = await pool.query(
    type === "inner_db_work"
      ? getFamilyUsersIdWhoDoesntHaveInnerBook
      : getFamilyUsersIdWhoDoesntHaveBook,
    array
  );

  res.json(rows.map((i) => i.user_id));
};

const getUsersIdWhoDoesntReadBook = async (
  req: Request<{ id: string; type: string }, {}, {}>,
  res: Response
) => {
  const { id, type } = req.params;
  const user = getUserInSession(req, res);
  const book = await getBookById(type, id, user.id);

  const array =
    type === "inner_db_work"
      ? [user.family_id, book?.id]
      : [user.family_id, book?.id, book?.fantlab_id];

  const { rows } = await pool.query(
    type === "inner_db_work"
      ? getFamilyUsersIdWhoDoesntReadInnerBook
      : getFamilyUsersIdWhoDoesntReadBook,
    array
  );

  res.json(rows.map((i) => i.user_id));
};

const createBookInDb = async (
  req: Request<
    {},
    {},
    {
      name: string;
      description?: string;
      image?: string;
      isbn?: string;
      authors: { id?: string; name?: string }[];
      genres: { id?: string; name?: string }[];
      cycles?: { id?: string; name?: string }[];
    }
  >,
  res: Response
) => {
  if (!checkPostParams(req, ["name", "authors", "genres"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { name, description, image, isbn, authors, genres, cycles } = req.body;

  try {
    const newBook: IBookDto = {
      id: uuid(),
      fantlab_id: "",
      name,
      description,
      image_small: image,
      image_big: image,
      isbn_list: isbn,
      type: "inner_db_work",
    };

    await addBookFromOurDb(newBook);

    await Promise.all(
      authors.map(async (author) => {
        if (author.id) {
          await pool.query(
            "INSERT INTO authors_books(id, author_id, book_id) values($1, $2, $3)",
            [uuid(), author.id, newBook.id]
          );
        } else {
          if (author.name) {
            const search = await getAutorsByName(author.name);

            if (!!search) {
              await pool.query(
                "INSERT INTO authors_books(id, author_id, book_id) values($1, $2, $3)",
                [uuid(), search.id, newBook.id]
              );
            } else {
              const newAuthor = {
                id: uuid(),
                fantlab_id: -1,
                name: author.name || "",
              };

              await addAuthor(newAuthor);
              await pool.query(
                "INSERT INTO authors_books(id, author_id, book_id) values($1, $2, $3)",
                [uuid(), newAuthor.id, newBook.id]
              );
            }
          }
        }
      })
    );

    await Promise.all(
      genres.map(async (genre) => {
        if (genre.id) {
          await pool.query(
            "INSERT INTO genres_books(id, genre_id, book_id) values($1, $2, $3)",
            [uuid(), genre.id, newBook.id]
          );
        } else {
          if (genre.name) {
            const search = await getGenresByName(genre.name);

            if (!!search) {
              await pool.query(
                "INSERT INTO genres_books(id, genre_id, book_id) values($1, $2, $3)",
                [uuid(), search.id, newBook.id]
              );
            } else {
              const newGenre = {
                id: uuid(),
                fantlab_id: -1,
                name: genre.name || "",
              };

              await addGenres(newGenre);
              await pool.query(
                "INSERT INTO genres_books(id, genre_id, book_id) values($1, $2, $3)",
                [uuid(), newGenre.id, newBook.id]
              );
            }
          }
        }
      })
    );

    if (cycles) {
      await Promise.all(
        cycles.map(async (cycle) => {
          if (cycle.id) {
            await pool.query(
              "INSERT INTO cycles_books(id, cycle_id, book_id) values($1, $2, $3)",
              [uuid(), cycle.id, newBook.id]
            );
          } else {
            if (cycle.name) {
              const search = await getCycleByName(cycle.name);

              if (!!search) {
                await pool.query(
                  "INSERT INTO cycles_books(id, cycle_id, book_id) values($1, $2, $3)",
                  [uuid(), search.id, newBook.id]
                );
              } else {
                const newCycle = {
                  id: uuid(),
                  fantlab_id: -1,
                  name: cycle.name || "",
                  type: "цикл",
                };

                await addCycle(newCycle);
                await pool.query(
                  "INSERT INTO cycles_books(id, cycle_id, book_id) values($1, $2, $3)",
                  [uuid(), newCycle.id, newBook.id]
                );
              }
            }
          }
        })
      );
    }

    res.json({ bookId: newBook.id });
  } catch (error) {
    res.status(500).json({ error });
  }
};

export default {
  search,
  getBookByIdRequest,
  addBookInLibrary,
  markAsRead,
  removeBookFromLibrary,
  removeMark,
  getUserLibrary,
  getUsersIdWhoDoesntHaveBook,
  getUsersIdWhoDoesntReadBook,
  createBookInDb,
};
