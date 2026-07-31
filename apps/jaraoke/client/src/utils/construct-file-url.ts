export const constructFileUrl = (songId: string, fileName: string) =>
  `/api/song/${songId}/${fileName}`;
