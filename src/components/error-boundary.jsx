import { Component } from 'react';

/** Last line of defence: a crash shows a friendly screen with a way back, never a blank page. */
export class ErrorBoundary extends Component {
  state = { crashed: false };

  static getDerivedStateFromError() { return { crashed: true }; }

  componentDidCatch(error) { console.error('[ui crash]', error); }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#0b0b0c] p-8 text-center text-white">
        <div className="max-w-xs">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#FF6B00]/15 text-3xl">🔄</div>
          <h1 className="font-heading text-xl font-bold">Just a moment</h1>
          <p className="mt-2 text-sm text-white/65">This page needs a quick refresh. Your bookings and details are all saved.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 h-12 w-full rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5A1F] px-8 text-sm font-bold text-white shadow-[0_10px_26px_rgba(255,113,15,0.45)]">Refresh</button>
          <button type="button" onClick={() => { window.location.href = '/app'; }} className="mt-2 h-11 w-full rounded-full text-sm font-semibold text-white/70 hover:text-white">Go to home</button>
        </div>
      </div>
    );
  }
}
