const types: Record<string, string> = {
  ass: 'text/plain',
  mp4: 'video/mp4',
};

export const fileExtToMimeTypes = (ext: string) => {
  return types[ext] || 'text/plain';
};
