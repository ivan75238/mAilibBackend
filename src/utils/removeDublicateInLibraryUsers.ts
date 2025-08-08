interface ReaderInfo {
  reader_id: string;
  reader_name: string;
  read_date: string;
}

interface OwnerInfo {
  owner_id: string;
  owner_name: string;
  owner_date: string;
}

interface BookData {
  id: string;
  name: string;
  fantlab_id: string;
  readers_info: ReaderInfo[];
  owners_info: OwnerInfo[];
}

export function removeDuplicates(data: BookData[]): BookData[] {
  return data.map((book) => ({
    ...book,
    readers_info: removeReaderDuplicates(book.readers_info),
    owners_info: removeOwnerDuplicates(book.owners_info),
  }));
}

function removeReaderDuplicates(readers: ReaderInfo[]): ReaderInfo[] {
  const seen = new Set<string>();
  return readers.filter((reader) => {
    const key = `${reader.reader_id}|${reader.reader_name}|${reader.read_date}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function removeOwnerDuplicates(owners: OwnerInfo[]): OwnerInfo[] {
  const seen = new Set<string>();
  return owners.filter((owner) => {
    const key = `${owner.owner_id}|${owner.owner_name}|${owner.owner_date}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
