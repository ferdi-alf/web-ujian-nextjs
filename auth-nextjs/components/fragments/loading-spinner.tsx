export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-400"></div>
    </div>
  );
}
