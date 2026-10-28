import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Letters rise into place one after another. Words never break mid-word.
 * Screen readers get the plain text via aria-label.
 */
export function SplitText({ text, className, delay = 0, step = 28, as: Tag = 'span' }) {
  let i = 0;
  return (
    <Tag className={cn('split-text', className)} aria-label={text}>
      {String(text).split(' ').map((word, w) => (
        <span key={w} className="inline-block whitespace-nowrap" aria-hidden>
          {[...word].map((ch) => {
            const d = delay + i++ * step;
            return <span key={d} className="split-char inline-block" style={{ animationDelay: `${d}ms` }}>{ch}</span>;
          })}
          {w < String(text).split(' ').length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/** Typewriter that types, pauses, deletes and moves to the next phrase. */
export function TypeRotator({ words, className, typeMs = 55, holdMs = 1800 }) {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const word = words[idx % words.length];
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setLen(word.length); return undefined; }
    let t;
    if (!deleting && len < word.length) t = setTimeout(() => setLen(len + 1), typeMs);
    else if (!deleting && len === word.length) t = setTimeout(() => setDeleting(true), holdMs);
    else if (deleting && len > 0) t = setTimeout(() => setLen(len - 1), typeMs / 2);
    else { setDeleting(false); setIdx((n) => n + 1); }
    return () => clearTimeout(t);
  }, [len, deleting, word, typeMs, holdMs]);
  return (
    <span className={cn('type-rotator', className)} aria-label={words.join(', ')}>
      <span aria-hidden>{word.slice(0, len)}</span><span className="type-caret" aria-hidden />
    </span>
  );
}

/** Text with a light sweep passing across it every few seconds. */
export function ShineText({ children, className }) {
  return <span className={cn('shine-text', className)}>{children}</span>;
}
