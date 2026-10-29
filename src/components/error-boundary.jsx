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
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#FF6B00]/15 text-3xl">🛞</div>
          <h1 className="font-heading text-xl font-bold">We hit a bump</h1>
          <p className="mt-2 text-sm text-white/65">Something unexpected happened on this screen. Your bookings are safe — let's get you back on the road.</p>
          <button type="button" onClick={() => { window.location.href = '/app'; }} className="mt-5 h-12 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5A1F] px-8 text-sm font-bold text-white shadow-[0_10px_26px_rgba(255,113,15,0.45)]">Back to home</button>
        </div>
      </div>
    );
  }
}
