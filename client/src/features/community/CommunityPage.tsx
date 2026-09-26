import { useState } from 'react';
import { Activity, Banknote, BarChart3, BookOpen, Bot, Building2, Clock, Heart, Sprout, Star, TrendingDown, Users, X, ShieldCheck } from 'lucide-react';
import { PixelAvatar, FamilyCity, HouseCalendar } from '@/components/pixel';
import { Badge, Button, Card, CardTitle, ErrorState, IconTile, PageHero, PageSkeleton, Rich, ScoreRing, Skeleton, cx, type Tone } from '@/components/ui';
import { useLesson, useLessons, useOverview } from '@/lib/queries';
import type { Lesson } from '@/lib/queries';

export default function CommunityPage() {
  const { data: overview } = useOverview();
  const peaceLevel = overview?.peace?.level;
  const { data: lessons, error, refetch, isPending } = useLessons(peaceLevel);

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const featured = lessons?.find((l) => l.isFeatured);
  const regularLessons = lessons?.filter((l) => l.kind === 'lesson' && !l.isFeatured).slice(0, 4) ?? [];
  const storyLesson = lessons?.find((l) => l.kind === 'story');
  const historyLessons = lessons?.filter((l) => l.kind === 'history') ?? [];

  return (
    <div className="space-y-4">
      <PageHero
        title="Tài chính tốt hơn"
        highlight={<Rich text="khi ai cũng hiểu rõ hơn." />}
        subtitle={<Rich text="Những bài học đơn giản, dễ áp dụng, giúp nhiều người\nra quyết định bền vững hơn." />}
        sceneWidth="55%"
        scene={(cls) => <FamilyCity className={cls} />}
      />

      {peaceLevel === 'action' && (
        <Card tone="rose">
          <CardTitle icon={ShieldCheck} tone="red" title="Gợi ý cho bạn" subtitle="Dựa trên tình trạng tài chính, An Tâm AI gợi ý bài học phù hợp." />
        </Card>
      )}
      {peaceLevel === 'watch' && (
        <Card tone="cream">
          <CardTitle icon={ShieldCheck} tone="orange" title="Gợi ý cho bạn" subtitle="Dựa trên tình trạng tài chính, An Tâm AI gợi ý bài học phù hợp." />
        </Card>
      )}
      {peaceLevel === 'stable' && (
        <Card tone="mint">
          <CardTitle icon={ShieldCheck} tone="green" title="Gợi ý cho bạn" subtitle="Dựa trên tình trạng tài chính, An Tâm AI gợi ý bài học phù hợp." />
        </Card>
      )}

      {featured && <FeaturedCard lesson={featured} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {regularLessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>

      {storyLesson && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <StoryCard lesson={storyLesson} />
          <AiHelpCard />
        </div>
      )}

      {historyLessons.length > 0 && <HistoryCard lessons={historyLessons} />}
    </div>
  );
}

/* ───────── Featured Card ───────── */

function FeaturedCard({ lesson }: { lesson: Lesson }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(lesson.slug);

  return (
    <>
      <Card className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
        <div>
          <Badge tone="orange" icon={Star} className="mb-4">
            Bài học nổi bật tuần này
          </Badge>
          <h3 className="text-[22px] font-bold leading-tight text-ink">{lesson.title}</h3>
          <p className="mt-2 text-sm text-ink-soft">{lesson.excerpt}</p>
          <Button variant="accent" arrow onClick={() => setSelectedSlug(lesson.slug)} className="mt-4">
            Xem bài học
          </Button>
        </div>
        <div className="hidden md:block">
          <HouseCalendar className="h-[180px] w-[220px]" />
        </div>
      </Card>
      {selectedSlug && <LessonReader slug={selectedSlug} onClose={() => setSelectedSlug(null)} />}
    </>
  );
}

/* ───────── Lesson Card ───────── */

const ICON_MAP: Record<string, typeof Sprout> = {
  sprout: Sprout,
  'trending-down': TrendingDown,
  home: BarChart3,
  'shield-plus': Activity,
};

function LessonCard({ lesson }: { lesson: Lesson }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const Icon = ICON_MAP[lesson.icon] || Sprout;
  const toneMap: Record<string, Tone> = {
    sprout: 'green',
    'trending-down': 'red',
    home: 'violet',
    'shield-plus': 'green',
  };
  const tone: Tone = toneMap[lesson.icon] || 'green';

  return (
    <>
      <Card>
        <IconTile icon={Icon} tone={tone} size="lg" />
        <h3 className="mt-4 text-[15px] font-bold text-ink">{lesson.title}</h3>
        <p className="mt-2 text-xs text-ink-soft line-clamp-2">{lesson.excerpt}</p>
        <Button variant="soft" arrow size="sm" onClick={() => setSelectedSlug(lesson.slug)} className="mt-4">
          Xem nhanh
        </Button>
      </Card>
      {selectedSlug && <LessonReader slug={selectedSlug} onClose={() => setSelectedSlug(null)} />}
    </>
  );
}

/* ───────── Story Card ───────── */

function StoryCard({ lesson }: { lesson: Lesson }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const percentMatch = lesson.title.match(/(\d+)%.*?(\d+)%/);
  const before = percentMatch ? parseInt(percentMatch[1], 10) : 61;
  const after = percentMatch ? parseInt(percentMatch[2], 10) : 87;

  return (
    <>
      <Card>
        <CardTitle icon={Users} title="Một câu chuyện thực tế" />
        <div className="flex items-start gap-4">
          <PixelAvatar seed={38} className="h-20 w-20 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm">{lesson.title}</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 border border-line relative">
              <span className="absolute top-1 left-2 text-2xl text-ink-mute">"</span>
              <p className="text-xs text-ink-soft pl-4 leading-relaxed">{lesson.excerpt}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-center">
            <ScoreRing score={before} max={100} size={96} />
            <p className="text-xs text-ink-soft mt-2">Trước</p>
          </div>
          <div className="text-xl text-ink font-bold">→</div>
          <div className="text-center">
            <ScoreRing score={after} max={100} size={96} color="#1FA16B" />
            <p className="text-xs text-ink-soft mt-2">Sau 6 tháng</p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs font-semibold text-ink">Khả năng mua nhà</p>
        <Button variant="soft" arrow className="w-full mt-4" onClick={() => setSelectedSlug(lesson.slug)}>
          Xem câu chuyện
        </Button>
      </Card>
      {selectedSlug && <LessonReader slug={selectedSlug} onClose={() => setSelectedSlug(null)} />}
    </>
  );
}

/* ───────── AI Help Card ───────── */

const AI_HELP: Array<{ icon: typeof BookOpen; tone: Tone; title: string }> = [
  { icon: BookOpen, tone: 'violet', title: 'Giải thích tài chính bằng ngôn ngữ dễ hiểu' },
  { icon: BarChart3, tone: 'green', title: 'Biến dữ liệu khó khăn thành hành động thực tế' },
  { icon: Heart, tone: 'orange', title: 'Giúp người dùng bớt đầu tư theo cảm xúc' },
  { icon: Users, tone: 'blue', title: 'Tạo cơ hội để nhiều người tự tin hơn với tiền bạc' },
];

function AiHelpCard() {
  return (
    <Card>
      <CardTitle icon={Bot} title="AI giúp cộng đồng như thế nào?" />
      <ul className="space-y-3">
        {AI_HELP.map((item) => (
          <li key={item.title} className="flex items-start gap-2.5">
            <IconTile icon={item.icon} tone={item.tone} size="sm" />
            <p className="text-xs text-ink-soft flex-1">{item.title}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ───────── History Card ───────── */

const HISTORY_ICON_MAP: Record<string, { icon: typeof Building2; gradient: string }> = {
  building: { icon: Building2, gradient: 'from-red-600 to-red-900' },
  coins: { icon: Banknote, gradient: 'from-yellow-500 to-yellow-700' },
  virus: { icon: Activity, gradient: 'from-red-500 to-red-800' },
};

function HistoryCard({ lessons }: { lessons: Lesson[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  return (
    <>
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Clock className="h-5 w-5 text-ink" aria-hidden />
            Mô phỏng các bài học lịch sử
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">Nhìn lại các giai đoạn quan trọng trong quá khứ để rút ra bài học cho hôm nay.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {lessons.slice(0, 3).map((lesson) => {
            const config = HISTORY_ICON_MAP[lesson.icon] || HISTORY_ICON_MAP.building;
            const Icon = config.icon;
            return (
              <div
                key={lesson.id}
                className={cx('rounded-xl p-4 text-white overflow-hidden', `bg-gradient-to-br ${config.gradient}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h4 className="font-bold text-sm line-clamp-2">{lesson.title}</h4>
                <p className="mt-2 text-xs text-white/80 line-clamp-2">{lesson.excerpt}</p>
                <Button variant="white" arrow size="sm" className="mt-3 w-full" onClick={() => setSelectedSlug(lesson.slug)}>
                  Xem nhanh
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
      {selectedSlug && <LessonReader slug={selectedSlug} onClose={() => setSelectedSlug(null)} />}
    </>
  );
}

/* ───────── Lesson Reader ───────── */

function LessonReader({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data: lesson, isPending } = useLesson(slug);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose} role="dialog" aria-modal="true" aria-label="Đọc bài học">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-line px-6 py-4 flex items-center justify-between">
          <div>
            {lesson && (
              <>
                <Badge tone="blue" className="mb-2">{lesson.category}</Badge>
                <h2 className="text-lg font-bold text-ink">{lesson.title}</h2>
                <p className="text-xs text-ink-soft mt-1">{lesson.readTime}</p>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-soft hover:bg-slate-100" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {isPending ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full mt-4" />
            </>
          ) : lesson ? (
            <>
              <p className="text-sm text-ink-soft">{lesson.excerpt}</p>
              {lesson.bodyMd && <MarkdownBody markdown={lesson.bodyMd} />}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-ink mt-4 mb-2">
          {line.slice(3)}
        </h3>
      );
    } else if (line.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-sm text-ink-soft leading-relaxed">
          {line}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-2">{elements}</div>;
}
