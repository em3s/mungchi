"use client";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-xl text-sm z-[100] shadow-lg animate-toast-in">
      {message}
    </div>
  );
}
