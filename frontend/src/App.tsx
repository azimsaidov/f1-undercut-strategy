import { useCallback, useRef, useState } from 'react';
import SessionPicker from './components/SessionPicker';
import DriverSelector from './components/DriverSelector';
import Dashboard from './components/Dashboard';
import { fetchEvaluation } from './api/client';
import type { SessionInfo, UndercutResult } from './types';

export default function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [result, setResult] = useState<UndercutResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lapLoading, setLapLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLap, setCurrentLap] = useState<number | null>(null);

  // Remember the last driver pair so the lap slider can re-fetch
  const driverPairRef = useRef<{ leader: number; chaser: number } | null>(null);

  async function handleAnalyze(leader: number, chaser: number) {
    if (!session) return;
    driverPairRef.current = { leader, chaser };
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchEvaluation(session.session_key, leader, chaser);
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setAnalyzing(false);
    }
  }

  const handleLapChange = useCallback(
    async (lap: number) => {
      if (!session || !driverPairRef.current) return;
      const { leader, chaser } = driverPairRef.current;
      setLapLoading(true);
      setCurrentLap(lap);
      try {
        const data = await fetchEvaluation(session.session_key, leader, chaser, lap);
        setResult(data);
        setError(null);
      } catch (err: any) {
        setError(err.message ?? 'Something went wrong');
      } finally {
        setLapLoading(false);
      }
    },
    [session],
  );

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-lg font-black text-white">
          F1
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Undercut Strategy Simulator
          </h1>
          <p className="text-xs text-zinc-500">
            Powered by OpenF1 — analyze pit strategy viability at any point in the race
          </p>
        </div>
      </header>

      {/* Session selection */}
      <section className="mb-6 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
        <SessionPicker onSessionSelected={(s) => { setSession(s); setResult(null); setError(null); setCurrentLap(null); }} />
      </section>

      {/* Driver selection */}
      {session && (
        <section className="mb-6 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
          <div className="mb-3 text-xs text-zinc-500">
            Session: <span className="text-zinc-300">{session.session_name}</span> — {session.country_name ?? ''} — key {session.session_key}
          </div>
          <DriverSelector sessionKey={session.session_key} onAnalyze={handleAnalyze} analyzing={analyzing} currentLap={currentLap} />
        </section>
      )}

      {/* Error toast */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-700/40 bg-red-900/20 px-5 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {analyzing && (
        <div className="flex items-center justify-center gap-3 py-16 text-zinc-400">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-red-500" />
          <span>Fetching data and computing strategy...</span>
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <section className="mb-8">
          <Dashboard result={result} onLapChange={handleLapChange} lapLoading={lapLoading} />
        </section>
      )}
    </div>
  );
}
