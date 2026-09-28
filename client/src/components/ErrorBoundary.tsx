import { Component, useState, type ReactNode, type ErrorInfo } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import type { Locale } from '@shared/i18n';
import { translate as sharedT } from '@/app/messages';
import { useSafeLocale, getStoredLocale } from '@/app/locale';

const FALLBACK_TRANSLATIONS: Record<Locale, Record<string, string>> = {
  vi: {
    'error.title': 'Đã xảy ra sự cố ngoài ý muốn',
    'error.subtitle': 'Hệ thống ghi nhận sự cố khi hiển thị trang. Bạn có thể thử lại, tải lại trang hoặc quay về trang chủ.',
    'error.chunk_title': 'Phiên bản mới sẵn sàng',
    'error.chunk_subtitle': 'Ứng dụng vừa có bản cập nhật mới. Vui lòng tải lại trang để nạp giao diện và tính năng mới nhất.',
    'error.not_found_title': 'Không tìm thấy trang',
    'error.not_found_subtitle': 'Địa chỉ bạn truy cập không tồn tại hoặc đã được chuyển sang đường dẫn khác.',
    'error.action_retry': 'Thử lại',
    'error.action_reload': 'Tải lại trang',
    'error.action_home': 'Về trang chủ',
    'error.technical_details': 'Chi tiết lỗi kỹ thuật',
    'error.copy_details': 'Sao chép mã lỗi',
    'error.copied': 'Đã sao chép',
    'error.status_chunk': 'Cập nhật ứng dụng',
    'error.status_error': 'Sự cố hiển thị',
  },
  en: {
    'error.title': 'Something went wrong',
    'error.subtitle': 'An unexpected error occurred while rendering the page. You can retry, reload the page, or return to the dashboard.',
    'error.chunk_title': 'Update Available',
    'error.chunk_subtitle': 'A newer version of the application has been deployed. Please reload the page to load the latest assets.',
    'error.not_found_title': 'Page Not Found',
    'error.not_found_subtitle': 'The link you followed does not exist or might have been moved.',
    'error.action_retry': 'Try Again',
    'error.action_reload': 'Reload Page',
    'error.action_home': 'Back to Home',
    'error.technical_details': 'Technical error details',
    'error.copy_details': 'Copy error details',
    'error.copied': 'Copied',
    'error.status_chunk': 'App Update',
    'error.status_error': 'Render Error',
  },
  zh: {
    'error.title': '发生意外错误',
    'error.subtitle': '渲染此页面时发生异常。您可以尝试重试、刷新页面或返回主页。',
    'error.chunk_title': '有新版本可用',
    'error.chunk_subtitle': '应用程序已发布更新。请刷新页面以加载最新资源。',
    'error.not_found_title': '页面未找到',
    'error.not_found_subtitle': '您访问的链接不存在或已被移动。',
    'error.action_retry': '重试',
    'error.action_reload': '刷新页面',
    'error.action_home': '返回主页',
    'error.technical_details': '技术错误详情',
    'error.copy_details': '复制错误信息',
    'error.copied': '已复制',
    'error.status_chunk': '应用更新',
    'error.status_error': '渲染异常',
  },
};

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk')
  );
}

function useResolvedLocale() {
  const safeCtx = useSafeLocale();
  if (safeCtx) {
    return {
      locale: safeCtx.locale,
      t: (key: string, vars?: Record<string, string | number>) => {
        const direct = safeCtx.t(key, vars);
        if (direct && direct !== key) return direct;
        const fallback = FALLBACK_TRANSLATIONS[safeCtx.locale]?.[key];
        if (fallback) {
          if (!vars) return fallback;
          let str = fallback;
          for (const [k, v] of Object.entries(vars)) {
            str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
          }
          return str;
        }
        return key;
      },
    };
  }

  const locale = getStoredLocale();
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => {
      const fallback = FALLBACK_TRANSLATIONS[locale]?.[key];
      if (fallback) {
        if (!vars) return fallback;
        let str = fallback;
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
        }
        return str;
      }
      return sharedT(locale, key, vars);
    },
  };
}

interface ErrorViewProps {
  error: unknown;
  is404?: boolean;
  isChunk?: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

export function ErrorView({
  error,
  is404 = false,
  isChunk = false,
  onRetry,
  onReload,
  onGoHome,
}: ErrorViewProps) {
  const { t } = useResolvedLocale();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trích xuất thông tin lỗi ngắn gọn
  let errorMessage = '';
  let errorStack = '';
  let errorStatus: number | string | null = null;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || (typeof error.data === 'string' ? error.data : JSON.stringify(error.data));
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack || '';
  } else if (error && typeof error === 'object') {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = String(error);
    }
  } else {
    errorMessage = String(error || '');
  }

  const handleCopy = async () => {
    const payload = [
      `[An Tâm AI - Error Report]`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Status: ${errorStatus ?? 'N/A'}`,
      `Message: ${errorMessage}`,
      errorStack ? `Stack:\n${errorStack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-lg bg-white border border-line rounded-2xl shadow-card p-6 sm:p-8 text-center transition-all">
        {/* Badge & Icon hiển thị theo loại lỗi (Light Mode, rõ ràng, không glassmorphism) */}
        <div className="flex flex-col items-center">
          {isChunk ? (
            <div className="w-14 h-14 rounded-2xl bg-accent-50 border border-accent-100 flex items-center justify-center text-accent-600 mb-4 shadow-sm">
              <Layers className="w-7 h-7" />
            </div>
          ) : is404 ? (
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
              <span className="font-bold text-lg">404</span>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-danger-50 border border-danger-100 flex items-center justify-center text-danger-600 mb-4 shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>
          )}

          {/* Badge trạng thái */}
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-ink-mute mb-2">
            {isChunk
              ? t('error.status_chunk')
              : is404
              ? 'HTTP 404'
              : errorStatus
              ? `HTTP ${errorStatus}`
              : t('error.status_error')}
          </span>

          {/* Tiêu đề & Giải thích thân thiện */}
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            {isChunk ? t('error.chunk_title') : is404 ? t('error.not_found_title') : t('error.title')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-ink-soft leading-relaxed max-w-md">
            {isChunk
              ? t('error.chunk_subtitle')
              : is404
              ? t('error.not_found_subtitle')
              : t('error.subtitle')}
          </p>
        </div>

        {/* 3 Hành động rõ ràng: Thử lại | Tải lại trang | Về trang chủ */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('error.action_retry')}</span>
          </button>

          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-line text-ink text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('error.action_reload')}</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-line/60 text-ink-soft hover:text-ink text-sm font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
          >
            <Home className="w-4 h-4" />
            <span>{t('error.action_home')}</span>
          </button>
        </div>

        {/* Thông tin lỗi kỹ thuật (collapsible & copyable, thân thiện, không đập stack vào mắt) */}
        {errorMessage && (
          <div className="mt-6 pt-4 border-t border-line text-left">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-medium text-ink-mute hover:text-ink transition-colors py-1 focus:outline-none"
            >
              <span>{t('error.technical_details')}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-line rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                  <span className="font-mono text-ink font-semibold truncate">
                    {errorStatus ? `[Status ${errorStatus}] ` : ''}
                    {errorMessage}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-ink-soft hover:text-ink bg-white border border-line rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success-600" />
                        <span className="text-success-600">{t('error.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('error.copy_details')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-mono text-[11px] text-ink-soft space-y-1">
                  <div>
                    <span className="text-ink-mute">Path: </span>
                    <span>{window.location.pathname + window.location.search}</span>
                  </div>
                  <div>
                    <span className="text-ink-mute">Time: </span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                </div>

                {errorStack && (
                  <pre className="max-h-28 overflow-auto font-mono text-[11px] text-ink-mute bg-white p-2 border border-line/60 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {errorStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    try {
      sessionStorage.removeItem('chunk_reload');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorView
          error={this.state.error}
          isChunk={isChunkLoadError(this.state.error)}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error('Route error caught by RouteErrorBoundary:', error);

  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const isChunk = isChunkLoadError(error);

  const handleRetry = () => {
    try {
      navigate(0);
    } catch {
      window.location.reload();
    }
  };

  const handleReload = () => {
    try {
      sessionStorage.removeItem('chunk_reload');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const handleGoHome = () => {
    try {
      navigate('/');
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <ErrorView
      error={error}
      is404={is404}
      isChunk={isChunk}
      onRetry={handleRetry}
      onReload={handleReload}
      onGoHome={handleGoHome}
    />
  );
}
