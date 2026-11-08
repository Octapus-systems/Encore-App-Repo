// Freeze the page behind a full-screen sheet. overflow:hidden alone is not enough on iPhone:
// when the keyboard opens Safari/Chrome still scroll the page, and fixed sheets slide off screen.
// Pinning <body> with position:fixed stops that; the scroll position is restored on close.
let depth = 0;
let saved = null;
export function lockPageScroll() {
  if (depth++ === 0) {
    const y = window.scrollY;
    const b = document.body.style;
    saved = { y, position: b.position, top: b.top, left: b.left, right: b.right, width: b.width, overflow: b.overflow };
    Object.assign(b, { position: 'fixed', top: `-${y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
    document.documentElement.classList.add('sheet-open');
  }
  let done = false;
  return () => {
    if (done) return; done = true;
    if (--depth > 0 || !saved) return;
    const { y, ...prev } = saved; saved = null;
    Object.assign(document.body.style, prev);
    document.documentElement.classList.remove('sheet-open');
    window.scrollTo(0, y);
  };
}

/** iPhone may still nudge the page while the keyboard opens: put it back at the top. */
export const undoPageNudge = () => { if (window.scrollY !== 0) window.scrollTo(0, 0); };

/**
 * Keep a full-screen sheet exactly over the part of the screen above the keyboard.
 * iPhone browsers move the page in different ways when the keyboard opens, so instead of
 * predicting it we measure where the sheet really is and shift it onto the visible area.
 */
export function useVisibleArea(sheetRef, useState, useEffect) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const [area, setArea] = useState(() => ({ h: vv?.height || window.innerHeight, y: 0 }));
  useEffect(() => {
    let raf = 0;
    let y = 0;
    const fit = () => {
      undoPageNudge();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = vv ? vv.height : window.innerHeight;
        const want = vv ? Math.max(0, vv.offsetTop) : 0;
        const el = sheetRef.current;
        // where the sheet actually sits now (includes the shift already applied)
        const at = el ? el.getBoundingClientRect().top : y;
        y = Math.round(y + (want - at));
        if (Math.abs(y) > 2000) y = want; // safety: never run away
        setArea((a) => (a.h === h && a.y === y ? a : { h, y }));
      });
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    window.addEventListener('scroll', fit);
    document.addEventListener('focusin', fit);
    const late = setInterval(fit, 400); // iPhone finishes moving the page a little after the events
    return () => {
      cancelAnimationFrame(raf); clearInterval(late);
      vv?.removeEventListener('resize', fit); vv?.removeEventListener('scroll', fit);
      window.removeEventListener('scroll', fit); document.removeEventListener('focusin', fit);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return area;
}
