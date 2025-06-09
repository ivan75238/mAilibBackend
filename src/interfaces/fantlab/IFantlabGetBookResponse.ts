import { IFantlabGenre } from "./IFantlabGenre";

export interface IFantlabGetBookResponse {
  work_id: number;
  work_name: string;
  authors: {
    type: "author" | "art";
    id: number;
    name: string;
  }[];
  work_description: string;
  image: string; // ссылка на картинку произведения (обложку по умолчанию)
  image_preview: string; // ссылка на превью картинки произведения
  work_type_id: number;
  work_type: string;
  editions_info: {
    isbn_list: string;
  };
  classificatory: {
    genre_group: {
      genre: IFantlabGenre[];
      label: string;
    }[];
  };
}
