export const clearDescription = (s: string | null) => {
  if (!s) return "";

  return s
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1") // удаляем теги <a>, оставляя содержимое
    .replace(/\[.*?\]/g, ""); // удаляем все что находится в квадратных скобках
};
