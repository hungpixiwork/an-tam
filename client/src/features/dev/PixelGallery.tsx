import { FamilyCity, HeroLakeCity, HouseCalendar, PixelAvatar, WindingPath } from '@/components/pixel';

/** Trang xem trước scene pixel art — chỉ có ở môi trường dev. */
export default function PixelGallery() {
  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-8 space-y-8">
      <h1 className="text-2xl font-bold text-ink">Pixel art gallery</h1>
      <section>
        <h2 className="mb-2 font-semibold text-ink-soft">HeroLakeCity (banner 1150×180)</h2>
        <div className="relative h-[150px] w-full max-w-[1150px] overflow-hidden rounded-2xl bg-gradient-to-r from-[#EAF4FB] to-[#DCEBF7] sm:h-[180px]">
          <HeroLakeCity className="absolute right-0 top-0 h-full w-[66%] [mask-image:linear-gradient(to_right,transparent,black_22%)]" />
        </div>
      </section>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
        <section>
          <h2 className="mb-2 font-semibold text-ink-soft">HouseCalendar</h2>
          <div className="h-[110px] w-full max-w-[340px] rounded-2xl bg-cream p-2"><HouseCalendar className="h-full w-full" /></div>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-ink-soft">FamilyCity</h2>
          <div className="h-[110px] w-full max-w-[320px] rounded-2xl bg-white p-2"><FamilyCity className="h-full w-full" /></div>
        </section>
        <section>
          <h2 className="mb-2 font-semibold text-ink-soft">WindingPath</h2>
          <div className="h-[290px] w-[224px] max-w-full overflow-hidden rounded-2xl"><WindingPath className="h-full w-full" /></div>
        </section>
      </div>
      <section>
        <h2 className="mb-2 font-semibold text-ink-soft">PixelAvatar (44px / 80px)</h2>
        <div className="flex flex-wrap items-center gap-3">
          {[1930, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
            <PixelAvatar key={s} seed={s} className="h-11 w-11 rounded-full" />
          ))}
          <PixelAvatar seed={1930} className="h-20 w-20 rounded-full" />
        </div>
      </section>
    </div>
  );
}
