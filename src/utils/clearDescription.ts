export const clearDescription = (s: string) => {
    return s.replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1") // удаляем теги <a>, оставляя содержимое
        .replace(/\[.*?\]/g, ""); // удаляем все что находится в квадратных скобках
}