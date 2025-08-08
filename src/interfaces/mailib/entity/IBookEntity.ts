import IAuthorDto from "../dto/IAuthorDto";
import IBookDto from "../dto/IBookDto";
import ICycleDto from "../dto/ICycleDto";
import IGenreDto from "../dto/IGenreDto";

export default interface IBookEntity extends Omit<IBookDto, "id"> {
  id?: string;
  authors: IAuthorDto[];
  genres: IGenreDto[];
  cycles: ICycleDto[];
  is_own_by_user: boolean;
  is_read_by_user: boolean;
}
