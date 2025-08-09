export function parseBracketAutors(str: string) {
  const result = [];
  const autorRegex = /\[autor=(\d+)\](.*?)\[\/autor\]/g;

  let match;
  while ((match = autorRegex.exec(str)) !== null) {
    result.push({
      fantlab_id: parseInt(match[1]),
      name: match[2].trim(),
    });
  }

  return result;
}
