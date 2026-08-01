import { Component } from 'react';

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render failed:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen grid place-items-center bg-slate-50 p-6 text-center">
          <section className="max-w-lg rounded-2xl bg-white p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-[#1a1b4b]">My Space could not load</h1>
            <p className="mt-3 text-slate-600">Refresh the page to try again. The error details are available in the browser console.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
