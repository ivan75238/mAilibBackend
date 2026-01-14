export const FANTLAB_SEARCH_MAIN = "https://api.fantlab.ru/searchmain";
export const FANTLAB_SEARCH_WORKS = "https://api.fantlab.ru/search-works";
export const FANTLAB_SEARCH_EDITIONS = "https://api.fantlab.ru/search-editions";
export const FANTLAB_GET_WORK = (id: string) =>
  `https://api.fantlab.ru/work/${id}/extended`;
export const FANTLAB_GET_EDITION = (id: string) =>
  `https://api.fantlab.ru/edition/${id}/extended`;
