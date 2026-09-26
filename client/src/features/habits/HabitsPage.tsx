import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Bot, CalendarDays, ChevronRight, CircleCheck, CircleMinus, Heart, Landmark, Lightbulb, Minus, Plus, Search, Shield, SquareCheck,
  Target, TrendingDown, Wallet, type LucideIcon,
} from 'lucide-react';
import type { HabitOption, HabitScenario, HabitsProfile } from '@shared/engine/analysis';
import { useMe } from '@/app/auth';
import { HeroLakeCity, PixelAvatar } from '@/components/pixel';
import { Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, ScoreRing, ButtonLink, cx, type Tone } from '@/components/ui';
import { useAnswerHabit, useHabits, useSetSelfScore } from '@/lib/queries';

export default function HabitsPage() {
  const { data, error, refetch, isPending } = useHabits();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHero
        title="Bạn nghĩ mình chịu được rủi ro đến đâu?"
        highlight="Hành động của bạn mới cho câu trả lời thật."
        subtitle="Mỗi lựa chọn trong cuộc sống tài chính đều phản ánh cách bạn thật sự\ncảm nhận và phản ứng. Cùng xem thói quen của bạn đang nói gì nhé."
        scene={(cls) => <HeroLakeCity className={cls} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <ProfileCard profile={data.profile} />
        <SelfVsActualCard profile={data.profile} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <ChoicesCard scenarios={data.scenarios} answers={data.answers} />
        <InsightsCard profile={data.profile} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <TipsCard />
        <AiBoundaryCard />
      </div>
    </div>
  );
}

/* ───────── Hồ sơ ───────── */

const TRAIT_ICON: LucideIcon[] = [BarChart3, Search, Shield];
const TRAIT_STYLE: Record<HabitsProfile['traits'][number]['tone'], { tile: Tone; pill: string }> = {
  success: { tile: 'green', pill: 'bg-success-50 text-success-600' },
  violet: { tile: 'violet', pill: 'bg-violet-50 text-violet-600' },
  accent: { tile: 'blue', pill: 'bg-accent-50 text-accent-600' },
};

function ProfileCard({ profile }: { profile: HabitsProfile }) {
  const me = useMe();
  return (
    <Card>
      <CardTitle icon={SquareCheck} title="Hồ sơ phản ứng của bạn" />
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <PixelAvatar seed={me.avatarSeed} className="h-32 w-32 shrink-0 rounded-full bg-[#D9F1E6] ring-8 ring-[#EAF7F0]" />
        <ul className="w-full space-y-3">
          {profile.traits.map((t, i) => (
            <li key={t.label} className="grid grid-cols-[auto_1fr] items-center gap-3 sm:grid-cols-[auto_minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <IconTile icon={TRAIT_ICON[i % TRAIT_ICON.length]} tone={TRAIT_STYLE[t.tone].tile} />
              <span className="text-[13.5px] text-ink">{t.label}</span>
              <span className={cx('col-span-2 rounded-xl px-3 py-2 text-[13.5px] font-semibold sm:col-span-1', TRAIT_STYLE[t.tone].pill)}>{t.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

const riskWord = (score: number) => (score >= 7 ? 'khá cao' : score >= 4 ? 'vừa phải' : 'thấp');
const levelWord = (score: number) => (score >= 7 ? 'cao' : score >= 4 ? 'trung bình' : 'thấp');

function SelfVsActualCard({ profile }: { profile: HabitsProfile }) {
  const setScore = useSetSelfScore();
  const change = (d: number) => setScore.mutate(Math.min(10, Math.max(0, profile.selfScore + d)));
  return (
    <Card>
      <CardTitle icon={BarChart3} title="Bạn tự đánh giá vs hành động thực tế" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:divide-x sm:divide-line">
        <div className="flex flex-col items-center text-center">
          <p className="text-sm font-semibold text-ink">
            Bạn tự nghĩ:
            <br />
            chịu rủi ro
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={() => change(-1)} disabled={setScore.isPending || profile.selfScore <= 0} className="rounded-full border border-line p-1.5 text-ink-soft hover:bg-slate-50 disabled:opacity-40" aria-label="Giảm mức tự đánh giá">
              <Minus className="h-4 w-4" />
            </button>
            <ScoreRing score={profile.selfScore} max={10} size={120} stroke={14} color="#1FA16B" label={`Tự đánh giá ${profile.selfScore}/10`} />
            <button type="button" onClick={() => change(1)} disabled={setScore.isPending || profile.selfScore >= 10} className="rounded-full border border-line p-1.5 text-ink-soft hover:bg-slate-50 disabled:opacity-40" aria-label="Tăng mức tự đánh giá">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 rounded-xl bg-success-50 px-4 py-3 text-[13px] leading-relaxed text-ink">
            Bạn cho rằng mình có thể chấp nhận rủi ro {riskWord(profile.selfScore)} để tìm kiếm lợi nhuận tốt hơn.
          </p>
        </div>
        <div className="flex flex-col items-center text-center sm:pl-6">
          <p className="text-sm font-semibold text-ink">
            Thực tế qua
            <br />
            mô phỏng
          </p>
          <div className="mt-3">
            {profile.actualScore === null ? (
              <ScoreRing score={0} max={10} size={120} stroke={14} color="#3B82F6" label="Chưa có dữ liệu">
                <span className="text-3xl font-bold text-ink-mute">–</span>
              </ScoreRing>
            ) : (
              <ScoreRing score={profile.actualScore} max={10} size={120} stroke={14} color="#3B82F6" label={`Thực tế ${profile.actualScore}/10`} />
            )}
          </div>
          <p className="mt-4 rounded-xl bg-accent-50 px-4 py-3 text-[13px] leading-relaxed text-ink">
            {profile.actualScore === null
              ? 'Trả lời các tình huống bên dưới để AI đánh giá.'
              : `Hành động của bạn cho thấy mức rủi ro phù hợp thực tế là khoảng ${levelWord(profile.actualScore)}.`}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ───────── Tình huống ───────── */

const SCENARIO_ICON: Record<string, { icon: LucideIcon; tone: Tone }> = {
  'trending-down': { icon: TrendingDown, tone: 'red' },
  'bar-chart': { icon: BarChart3, tone: 'red' },
  wallet: { icon: Wallet, tone: 'violet' },
};

const choiceStyle = (o: HabitOption) =>
  o.risk >= 6
    ? { cls: 'bg-success-50 text-success-600 border-[#CDEBDC]', icon: CircleCheck }
    : o.risk >= 4
      ? { cls: 'bg-warning-50 text-warning-600 border-[#F6E3C4]', icon: CircleMinus }
      : { cls: 'bg-accent-50 text-accent-700 border-accent-100', icon: Landmark };

function ChoicesCard({ scenarios, answers }: { scenarios: HabitScenario[]; answers: Record<string, string> }) {
  const answer = useAnswerHabit();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Card>
      <CardTitle icon={Heart} tone="red" title="Bạn đã chọn gì trong các tình huống thử?" />
      <ul className="space-y-3">
        {scenarios.map((s) => {
          const meta = SCENARIO_ICON[s.icon] ?? SCENARIO_ICON['trending-down'];
          const picked = s.options.find((o) => o.key === answers[s.id]);
          const open = editing === s.id || !picked;
          return (
            <li key={s.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-3">
                <IconTile icon={meta.icon} tone={meta.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-ink">{s.prompt}</p>
                  <p className="text-[13px] text-ink-soft">{s.context}</p>
                </div>
                {picked && !open && (
                  <button
                    type="button"
                    onClick={() => setEditing(s.id)}
                    className={cx('inline-flex min-w-[220px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold', choiceStyle(picked).cls)}
                    title="Đổi lựa chọn"
                  >
                    {(() => {
                      const Icon = choiceStyle(picked).icon;
                      return <Icon className="h-5 w-5 shrink-0" aria-hidden />;
                    })()}
                    {picked.label}
                  </button>
                )}
              </div>
              {open && (
                <div className="mt-3 flex flex-wrap gap-2 pl-14" role="group" aria-label={`Chọn phản ứng: ${s.prompt}`}>
                  {s.options.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      disabled={answer.isPending}
                      onClick={() => answer.mutate({ scenarioId: s.id, choice: o.key }, { onSuccess: () => setEditing(null) })}
                      aria-pressed={o.key === picked?.key}
                      className={cx('rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors', o.key === picked?.key ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line bg-white text-ink hover:bg-slate-50')}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const INSIGHT_STYLE: Record<HabitsProfile['insights'][number]['tone'], { icon: LucideIcon; tone: Tone }> = {
  success: { icon: CircleCheck, tone: 'green' },
  violet: { icon: BarChart3, tone: 'violet' },
  warning: { icon: Lightbulb, tone: 'orange' },
};

function InsightsCard({ profile }: { profile: HabitsProfile }) {
  return (
    <Card>
      <CardTitle icon={Bot} title="AI nhận ra điều gì?" />
      {profile.insights.length === 0 ? (
        <p className="rounded-xl bg-accent-50 p-4 text-sm text-ink-soft">
          Trả lời thêm tình huống để AI nhận xét ({profile.answered}/{profile.total}).
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {profile.insights.map((i) => {
              const st = INSIGHT_STYLE[i.tone];
              return (
                <li key={i.title} className="flex items-start gap-4 rounded-xl border border-line p-3.5">
                  <IconTile icon={st.icon} tone={st.tone} />
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{i.title}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">{i.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {profile.insights.some(i => i.tone === 'warning') && (
            <div className="mt-4 pt-2">
              <ButtonLink to="/danh-muc" variant="soft" arrow>Xem danh mục đầu tư</ButtonLink>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ───────── Gợi ý + ranh giới AI ───────── */

const TIPS = [
  { icon: Target, tone: 'blue', title: 'Đặt trước giới hạn rủi ro', body: 'Quy định mức giảm tối đa bạn có thể chấp nhận trước khi hành động.', to: '/ke-hoach' },
  { icon: Wallet, tone: 'green', title: 'Giữ quỹ dự phòng rõ ràng', body: 'Có sẵn khoản tiền mặt cho các tình huống bất ngờ trong cuộc sống.', to: '/muc-tieu' },
  { icon: CalendarDays, tone: 'blue', title: 'Xem lại danh mục mỗi quý, không quyết định theo cảm xúc hằng ngày', body: 'Dành thời gian nhìn lại bức tranh tổng thể thay vì phản ứng với tin tức ngắn hạn.', to: '/danh-muc' },
] as const;

function TipsCard() {
  return (
    <Card>
      <CardTitle icon={Lightbulb} tone="orange" title="Gợi ý thói quen tốt hơn" />
      <ul className="space-y-2">
        {TIPS.map((t) => (
          <li key={t.title}>
            <Link to={t.to} className="group flex items-center gap-4 rounded-xl border border-line p-3 hover:bg-slate-50">
              <IconTile icon={t.icon} tone={t.tone} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">{t.title}</span>
                <span className="block text-[12.5px] text-ink-soft">{t.body}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-ink-soft group-hover:text-ink" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AiBoundaryCard() {
  return (
    <Card tone="violet">
      <CardTitle icon={Bot} tone="violet" title="AI không làm thay bạn điều gì?" />
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[6px] border-danger-500 bg-white" aria-hidden>
          <span className="text-center text-lg font-extrabold leading-tight text-ink">
            MUA
            <br />
            BÁN
          </span>
          <span className="absolute h-[6px] w-[118%] rotate-[-45deg] rounded-full bg-danger-500" />
        </div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-[16px] font-bold text-ink">AI không ép bạn mua bán.</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">AI chỉ giúp bạn nhìn rõ hơn cách mình phản ứng và chuẩn bị quyết định hợp lý hơn.</p>
        </div>
      </div>
    </Card>
  );
}
