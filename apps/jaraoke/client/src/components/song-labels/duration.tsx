export const DurationSongLabel = ({ duration }: { duration: string }) => {
  return (
    <div className="px-4 py-0.5 text-sm bg-pink-400 rounded-md border-2 border-black">
      <p className="font-inter font-semibold">TTS: {duration}</p>
    </div>
  );
};
