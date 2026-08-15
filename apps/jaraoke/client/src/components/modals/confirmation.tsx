interface ConfirmationModalProps {
  question: string;
  onConfirm: () => void;
  onDeny: () => void;
}

export const ConfirmationModal = ({
  question,
  onConfirm,
  onDeny,
}: ConfirmationModalProps) => (
  <div
    role="presentation"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
    onClick={onDeny}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirmation"
      className="relative bg-background border border-purple-300 rounded-xl p-8 max-w-sm w-full mx-4 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.12) 0%, transparent 70%)',
        }}
      />

      <p className="font-sora text-xl font-bold text-white mb-2">Confirm</p>
      <p className="font-inter text-purple-200 text-sm mb-8">{question}</p>

      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 py-2 rounded-lg border border-purple-300/50 text-purple-300 font-bricolage font-semibold text-sm cursor-pointer hover:bg-purple-500/10 transition-colors"
          onClick={onDeny}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex-1 py-2 rounded-lg bg-purple-300 text-black font-bricolage font-bold text-sm cursor-pointer hover:bg-purple-400 transition-colors shadow-[0_0_16px_rgba(168,85,247,0.5)]"
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);
