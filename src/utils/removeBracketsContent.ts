export function removeBracketsContent(str: string) {
  // Удаляем все вхождения [*] и [/...], включая содержимое
  return str.replace(/\[.*?\]/g, "");
}
