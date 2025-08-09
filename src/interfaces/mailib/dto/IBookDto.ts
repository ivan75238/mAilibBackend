export default interface IBookDto {
  id: string;
  name: string;
  description?: string;
  image_small?: string;
  image_big?: string;
  fantlab_id?: string;
  isbn_list?: string;
  type: "fantlab_work" | "fantlab_edition" | "inner_db_work";
}
