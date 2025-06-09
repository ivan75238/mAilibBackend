import { IFantlabGenre } from "../interfaces/fantlab/IFantlabGenre";

export const flatGenres = (genres: IFantlabGenre[]) => {
  const result: IFantlabGenre[] = [];

  genres.forEach((genre) => {
    if (!genre.genre || genre.genre.length === 0) {
      result.push(genre);
    } else {
      result.push(...genre.genre);
    }
  });

  return result;
};
