interface ConfirmModalProps {
  title: string;
  subtitle?: React.ReactNode;
  emoji?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmColor?: string;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  subtitle,
  emoji,
  confirmLabel,
  cancelLabel = "아니요",
  confirmColor = "bg-red-500",
  disabled,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] animate-fade-in"
      onClick={() => !disabled && onCancel()}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[280px] max-w-[85vw] text-center animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {emoji && <div className="text-4xl mb-3">{emoji}</div>}
        <div className="text-lg font-bold mb-2">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-500 mb-5">{subtitle}</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={disabled}
            className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-500 active:bg-gray-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`flex-1 py-2.5 ${confirmColor} rounded-xl text-sm font-semibold text-white active:opacity-80`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
