import IAuthorDto from "../dto/IAuthorDto";
import IBookDto from "../dto/IBookDto";
import IGenreDto from "../dto/IGenreDto";

export default interface IBookEntity extends Omit<IBookDto, "id"> {
  id?: string;
  authors: IAuthorDto[];
  genres: IGenreDto[];
}
