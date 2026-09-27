export function HouseCalendar({ className }: { className?: string }) {
  return (
    <img
      src="/house-goals.jpg"
      alt="Ngôi nhà mơ ước và mục tiêu tài chính"
      className={className ? `h-full w-full object-cover object-center ${className}` : 'h-full w-full object-cover object-center'}
      loading="lazy"
    />
  );
}
