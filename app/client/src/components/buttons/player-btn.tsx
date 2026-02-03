import Icon from '@mdi/react';

interface PlayerBtnProps {
  icon: string;
  text: string;
  onClick: () => void;
}

export const PlayerBtn = ({ icon, onClick, text }: PlayerBtnProps) => {
  return (
    <button
      className="w-24 h-24 p-2 rounded-md bg-blue-300 flex flex-col justify-center items-center border-2 border-white hover:cursor-pointer"
      type="button"
      onClick={onClick}
    >
      <Icon path={icon} size={2} color="#fcd34d" />
      <p className="text-sm">{text}</p>
    </button>
  );
};
