import { useId, type InputHTMLAttributes } from 'react';

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        className="h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-mute focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
        {...input}
      />
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger-50 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">
      {message}
    </p>
  );
}
