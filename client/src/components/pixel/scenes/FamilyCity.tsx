export function FamilyCity({ className }: { className?: string }) {
  return (
    <img
      src="/family-city.jpg"
      alt="Gia đình và tương lai thịnh vượng"
      className={className ? `h-full w-full object-cover object-center ${className}` : 'h-full w-full object-cover object-center'}
      loading="lazy"
    />
  );
}
