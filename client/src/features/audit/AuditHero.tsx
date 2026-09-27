import { ShieldCheck } from 'lucide-react';
import { useLocale } from '@/app/locale';

/** Banner đầu trang: tiêu đề bên trái, hộp "Dữ liệu của bạn luôn an toàn" nổi trên ảnh bên phải. */
export function AuditHero() {
  const { t } = useLocale();
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-[#DCEAF6] bg-gradient-to-r from-[#EEF6FC] via-[#E8F2FB] to-[#DFEEF8]">
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[42%] md:block">
        <img src="/hero-lake-city.jpg" alt="" className="h-full w-full object-cover [mask-image:linear-gradient(to_right,transparent,black_30%)]" style={{ objectPosition: 'right 60%' }} />
      </div>
      <div className="flex flex-col gap-4 px-6 py-6 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink md:text-[31px]">{t('audit.hero.title')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft md:text-[16px]">{t('audit.hero.subtitle')}</p>
        </div>
        <div className="flex max-w-[420px] shrink-0 items-start gap-3.5 rounded-2xl bg-white/95 px-5 py-4 shadow-soft ring-1 ring-black/[0.03] backdrop-blur-sm lg:mr-[10%]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success-50 text-success-600">
            <ShieldCheck className="h-7 w-7" strokeWidth={2.2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-primary-700">{t('audit.hero.safe_title')}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t('audit.hero.safe_body')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
