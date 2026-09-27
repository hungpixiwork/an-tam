export function WindingPath({ className }: { className?: string }) {
  return (
    <img
      src="/winding-path.jpg"
      alt="Lộ trình tài chính an tâm và tự do"
      className={className ? `h-full w-full object-cover object-center ${className}` : 'h-full w-full object-cover object-center'}
      loading="lazy"
    />
  );
}
