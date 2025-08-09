export interface IFantlabGetEditionResponse {
  content: string[];
  copies: number;
  correct_level: number;
  cover_type: string;
  creators: Creators;
  description: string;
  edition_id: number;
  edition_name: string;
  edition_type: string;
  edition_type_plus: any[];
  edition_work_id: any;
  format: string;
  format_mm: string;
  image: string;
  image_preview: string;
  images_plus: ImagesPlus;
  isbns: string[];
  lang: string;
  lang_code: string;
  last_modified: string;
  notes: string;
  pages: number;
  plan_date: string;
  plan_description: string;
  preread: number;
  series: Series[];
  type: number;
  volume: any;
  year: number;
}

interface Creators {
  authors: {
    type: "author" | "art";
    id: number;
    name: string;
  }[];
  compilers: any;
  publishers: Publisher[];
}

interface Publisher {
  id: string;
  name: string;
  type: string;
}

interface ImagesPlus {
  cover: Cover[];
  plus: Plu[];
}

interface Cover {
  image: string;
  image_orig: string;
  image_preview: string;
  image_spine: string;
  pic_copyright: any;
  pic_text: string;
}

interface Plu {
  image: string;
  image_preview: string;
  pic_copyright: any;
  pic_text: string;
}

export interface Series {
  id: string;
  is_opened: number;
  name: string;
  type: string;
}
