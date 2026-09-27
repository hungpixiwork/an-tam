export function HeroLakeCity({ className }: { className?: string }) {
  return (
    <img
      src="/hero-lake-city.jpg"
      alt="Thành phố An Tâm - Thiên nhiên và thịnh vượng"
      className={className ? `h-full w-full object-cover object-center ${className}` : 'h-full w-full object-cover object-center'}
      loading="lazy"
    />
  );
}
