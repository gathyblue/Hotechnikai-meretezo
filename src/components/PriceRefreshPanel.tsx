import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HEAT_PUMP_DATABASE } from '../heatPumpData';
import { X, RefreshCw, Github, ExternalLink, CheckCircle, XCircle, Clock, Play } from 'lucide-react';

const OWNER = 'gathyblue';
const REPO = 'Hotechnikai-meretezo';
const WORKFLOW = 'scrape-prices.yml';
const POLL_INTERVAL = 3000;

interface Run {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
}

interface PriceRefreshPanelProps {
  isDark: boolean;
  onClose: () => void;
}

export const PriceRefreshPanel: React.FC<PriceRefreshPanelProps> = ({ isDark, onClose }) => {
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [patToken, setPatToken] = useState(() => localStorage.getItem('gh_pat_token') || '');
  const [showPatInput, setShowPatInput] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [devOutput, setDevOutput] = useState<string | null>(null);
  const [trackingRun, setTrackingRun] = useState<Run | null>(null);
  const [changeLogs, setChangeLogs] = useState<Record<number, string[]>>({});
  const triggeredAtRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasPat = patToken.length > 0;
  const canTrack = isDev || hasPat;

  useEffect(() => {
    if (patToken) localStorage.setItem('gh_pat_token', patToken);
    else localStorage.removeItem('gh_pat_token');
  }, [patToken]);

  function ghHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  }

  const fetchChangeLog = useCallback(async (token: string, run: Run) => {
    if (run.conclusion !== 'success' || changeLogs[run.id]) return;
    try {
      const jobsRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs/${run.id}/jobs`,
        { headers: ghHeaders(token) }
      );
      if (!jobsRes.ok) return;
      const jobsData = await jobsRes.json();
      const job = jobsData.jobs?.[0];
      if (!job) return;

      const logRes = await fetch(job.logs_url || `https://api.github.com/repos/${OWNER}/${REPO}/actions/jobs/${job.id}/logs`, {
        headers: ghHeaders(token),
      });
      if (!logRes.ok) return;
      const text = await logRes.text();

      // Parse the "=== Frissítési eredmény ===" section
      const m = text.match(/=== Frissítési eredmény ===\n([\s\S]*?)={3,}/);
      if (m) {
        const lines = m[1].trim().split('\n').filter(l => l.includes('->') || l.includes('Árfolyam'));
        setChangeLogs(prev => ({ ...prev, [run.id]: lines }));
      } else {
        // Fallback: show last 15 lines that contain price info
        const lines = text.split('\n').filter(l => l.includes('€') || l.includes('Ft') || l.includes('=')).slice(-15);
        if (lines.length > 0) setChangeLogs(prev => ({ ...prev, [run.id]: lines }));
      }
    } catch { /* ignore */ }
  }, [changeLogs]);

  const fetchRuns = useCallback(async (token: string) => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=5`,
        { headers: ghHeaders(token) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const fetched = (data.workflow_runs || []) as Run[];
      setRuns(fetched);
      fetched.filter(r => r.conclusion === 'success').forEach(r => fetchChangeLog(token, r));
    } catch { /* ignore */ }
  }, [fetchChangeLog]);

  useEffect(() => {
    if (hasPat) fetchRuns(patToken);
  }, [hasPat, patToken, fetchRuns]);

  const pollRun = useCallback(async (token: string) => {
    const triggerTime = triggeredAtRef.current;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=5`,
        { headers: ghHeaders(token) }
      );
      if (!res.ok) return;
      const data = await res.json();
      const latest = data.workflow_runs?.[0];
      if (!latest) return;

      // If we haven't found our triggered run yet, check if this one is newer
      const target = triggerTime && new Date(latest.created_at).getTime() >= new Date(triggerTime).getTime()
        ? latest
        : data.workflow_runs?.find((r: Run) =>
            triggeredAtRef.current && new Date(r.created_at).getTime() >= new Date(triggeredAtRef.current).getTime()
          ) || latest;

      setRuns(prev => {
        const exists = prev.some(r => r.id === target.id);
        return exists ? prev.map(r => r.id === target.id ? target : r) : [target, ...prev];
      });

      // Only consider our triggered run once found
      if (triggerTime && new Date(target.created_at).getTime() < new Date(triggerTime).getTime()) {
        setScrapeResult('Várakozás a workflow elindulására...');
        return;
      }

      setTrackingRun(target);
      setScrapeResult(`#${target.run_number} ${statusLabel(target)}...`);

      if (target.status === 'completed') {
        if (pollRef.current) clearInterval(pollRef.current);
        setScraping(false);
        setTrackingRun(null);
        if (target.conclusion === 'success') {
          fetchChangeLog(token, target);
          setScrapeResult(`#${target.run_number} Árak frissítve! Az oldal újratöltődik...`);
          setTimeout(() => window.location.reload(), 4000);
        } else {
          setScrapeResult(`#${target.run_number} Hiba: ${statusLabel(target)}`);
        }
      }
    } catch {
      setScrapeResult('Hálózati hiba a GitHub API lekérdezésekor');
    }
  }, []);

  const panasonicModels = HEAT_PUMP_DATABASE.filter(hp => hp.manufacturer === 'Panasonic');
  const lastUpdate = panasonicModels.find(hp => hp.lastPriceUpdate)?.lastPriceUpdate;
  const sampleEur = panasonicModels.find(hp => hp.eurPriceNetto)?.eurPriceNetto;
  const sampleHuf = panasonicModels.find(hp => hp.eurPriceNetto)?.estimatedPriceHuf;
  const inferredRate = sampleEur && sampleHuf ? Math.round(sampleHuf / sampleEur / 1.27) : null;

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    setDevOutput(null);

    if (isDev) {
      setShowLog(true);
      try {
        const res = await fetch('/api/scrape-prices', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setDevOutput(data.output || '');
          setScrapeResult('Árak frissítve! Az oldal újratöltődik...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setScrapeResult('Hiba: ' + (data.error || 'ismeretlen'));
        }
      } catch (err: any) {
        setScrapeResult('Hiba: ' + (err.message || String(err)));
      } finally {
        setScraping(false);
      }
      return;
    }

    if (hasPat) {
      setShowLog(true);
      try {
        const res = await fetch(
          `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${patToken}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ref: 'main' }),
          }
        );
        if (res.status === 204) {
          triggeredAtRef.current = new Date().toISOString();
          setScrapeResult('Workflow elindítva! Várakozás a futás megjelenésére...');
          pollTimerRef.current = setTimeout(() => {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(() => pollRun(patToken), POLL_INTERVAL);
            pollRun(patToken);
          }, 2000);
        } else {
          const err = await res.json().catch(() => null);
          setScrapeResult(`Hiba (${res.status}): ${err?.message || 'ismeretlen'}`);
          setScraping(false);
        }
      } catch (err: any) {
        setScrapeResult('Hiba: ' + (err.message || String(err)));
        setScraping(false);
      }
      return;
    }

    setScraping(false);
    window.open(
      `https://github.com/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}`,
      '_blank',
      'noopener'
    );
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  function runIcon(run: Run) {
    if (run.status === 'queued' || run.status === 'waiting') return <Clock className="w-3 h-3 text-slate-400" />;
    if (run.status === 'in_progress') return <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />;
    if (run.conclusion === 'success') return <CheckCircle className="w-3 h-3 text-green-500" />;
    if (run.conclusion === 'failure' || run.conclusion === 'cancelled' || run.conclusion === 'timed_out')
      return <XCircle className="w-3 h-3 text-red-500" />;
    return <Play className="w-3 h-3 text-slate-400" />;
  }

  function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'most';
    if (m < 60) return `${m} perce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} órája`;
    return `${Math.floor(h / 24)} napja`;
  }

  function runDuration(run: Run): string {
    const start = new Date(run.created_at).getTime();
    const end = run.updated_at ? new Date(run.updated_at).getTime() : Date.now();
    const sec = Math.floor((end - start) / 1000);
    if (sec < 60) return `${sec}mp`;
    return `${Math.floor(sec / 60)}p ${sec % 60}mp`;
  }

  function statusLabel(run: Run): string {
    if (run.status === 'queued') return 'Várakozik';
    if (run.status === 'in_progress') return 'Futás közben';
    if (run.conclusion === 'success') return 'Sikeres';
    if (run.conclusion === 'failure') return 'Sikertelen';
    if (run.conclusion === 'cancelled') return 'Megszakítva';
    if (run.conclusion === 'timed_out') return 'Időtúllépés';
    return run.conclusion || run.status;
  }

  const t = isDark
    ? { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-slate-100', muted: 'text-slate-400', input: 'bg-slate-950', hover: 'hover:bg-slate-800' }
    : { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800', muted: 'text-slate-500', input: 'bg-slate-50', hover: 'hover:bg-slate-100' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className={`relative w-full max-w-sm h-full shadow-2xl border-l flex flex-col ${t.bg} ${t.border} ${t.text}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${t.border} ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider">Árfrissítő rendszer</h3>
          </div>
          <button onClick={onClose} className={`p-1 rounded border cursor-pointer ${t.border} ${t.hover}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-grow p-4 overflow-y-auto space-y-3 text-xs">
          <div className="space-y-2">
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-blue-50 border-blue-200'}`}>
              <p className="font-medium">
                {isDev
                  ? 'Helyi Vite API'
                  : hasPat
                    ? 'GitHub API (PAT token)'
                    : 'GitHub Actions (kézi)'
                }
              </p>
              <p className={`text-[10px] mt-1 ${t.muted}`}>
                {isDev
                  ? 'A Vite backend lekéri a webshop árakat (midea.hu, fisherklima.hu), az MNB árfolyamot, átszámolja a Panasonic EUR listaárakat, majd újratölti az oldalt.'
                  : hasPat
                    ? 'Egy gombnyomással elindul a GitHub Actions workflow: scrape → commit → build → deploy.'
                    : 'A gomb megnyitja a GitHub Actions oldalt. Adj meg egy PAT tokent a közvetlen indításhoz.'
                }
              </p>
            </div>

            <button
              onClick={handleScrape}
              disabled={scraping}
              className={`w-full font-bold text-xs py-2.5 rounded shadow cursor-pointer transition-all flex items-center justify-center gap-2 ${
                scraping
                  ? 'bg-slate-500 text-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
              {scraping
                ? trackingRun
                  ? `#${trackingRun.run_number} ${statusLabel(trackingRun)}...`
                  : 'Indítás folyamatban...'
                : isDev
                  ? 'Árak frissítése'
                  : hasPat
                    ? 'Árak frissítése (GitHub API)'
                    : 'Árak frissítése (GitHub Actions)'
              }
            </button>

            {scrapeResult && (
              <div className={`p-3 rounded text-xs font-bold ${
                scrapeResult.startsWith('Hiba')
                  ? 'bg-red-600 text-white border border-red-400'
                  : 'bg-green-600 text-white border border-green-400'
              }`}>
                {scrapeResult}
              </div>
            )}
          </div>

          {!isDev && (
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <button
                onClick={() => setShowPatInput(!showPatInput)}
                className="flex items-center gap-1.5 w-full text-left"
              >
                <Github className="w-3 h-3" />
                <span className="font-semibold text-[10px] uppercase tracking-wider">
                  {hasPat ? 'PAT token beállítva' : 'PAT token beállítása'}
                </span>
              </button>
              {showPatInput && (
                <div className="mt-2 space-y-1.5">
                  <p className={`text-[9px] ${t.muted}`}>
                    Hozz létre egy{' '}
                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
                       className="text-blue-500 underline">PAT tokent</a>{' '}
                    (<code className="text-[9px]">workflow</code> scope), illeszd be, és a gomb
                    közvetlenül a GitHub API-n keresztül indítja a workflow-t.
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      value={patToken}
                      onChange={e => setPatToken(e.target.value)}
                      placeholder="ghp_..."
                      className={`flex-1 px-2 py-1.5 rounded border text-[10px] font-mono outline-none ${t.input} ${t.border} ${t.text}`}
                    />
                    {patToken && (
                      <button
                        onClick={() => { setPatToken(''); setShowPatInput(false); }}
                        className={`px-2 py-1 rounded text-[9px] border cursor-pointer ${t.border} ${t.hover}`}
                      >
                        Törlés
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {lastUpdate && inferredRate && (
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={t.muted}>Árfolyam:</span>
                <span className="font-bold">1 € = {inferredRate} Ft</span>
              </div>
              <div className={`text-[9px] mt-1 ${t.muted}`}>
                Utolsó frissítés:{' '}
                <span className="font-semibold">
                  {lastUpdate.includes('T')
                    ? new Date(lastUpdate).toLocaleDateString('hu-HU', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })
                    : lastUpdate
                  }
                </span>
                {lastUpdate.includes('T') && (
                  <span className={`text-[9px] ml-1 ${t.muted}`}>
                    ({timeAgo(lastUpdate)})
                  </span>
                )}
              </div>
              <p className={`text-[9px] mt-1.5 ${t.muted}`}>
                Forrás: MNB középárfolyam + 1,3% (becsült vállalati deviza eladás).<br />
                Panasonic árak: Klíma Centrum Kft nettó EUR listaár × árfolyam × 1,27 (ÁFA).
              </p>
            </div>
          )}

          {(canTrack && (runs.length > 0 || scraping || devOutput)) && (
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <button
                onClick={() => setShowLog(!showLog)}
                className="flex items-center gap-1.5 w-full text-left"
              >
                <span className="font-semibold text-[10px] uppercase tracking-wider">Előzmények / Napló</span>
                <span className={`text-[9px] ${t.muted}`}>
                  {runs.length > 0 ? `(utolsó ${runs.length})` : scraping ? '(figyelés)' : ''}
                </span>
                {(() => {
                  const allLines: string[] = (Object.values(changeLogs) as string[][]).flat();
                  const changes = allLines.filter(l => l.includes('->'));
                  return changes.length > 0 ? (
                    <span className="text-[9px] text-green-500 ml-auto">+{changes.length} változás</span>
                  ) : null;
                })()}
              </button>

              {showLog && (
                <div className="mt-2 space-y-1">
                  {devOutput && (
                    <pre className={`max-h-48 overflow-y-auto text-[9px] font-mono whitespace-pre-wrap p-2 rounded ${t.input}`}>
                      {devOutput}
                    </pre>
                  )}

                  {runs.length > 0 && (
                    <div className="space-y-1">
                      {runs.map(run => {
                        const changes = changeLogs[run.id];
                        return (
                          <div key={run.id}>
                            <div className={`flex items-center gap-2 p-1.5 rounded ${t.hover}`}>
                              <span className="shrink-0">{runIcon(run)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[10px]">#{run.run_number}</span>
                                  <span className={`text-[9px] ${t.muted}`}>{statusLabel(run)}</span>
                                  {run.status === 'completed' && (
                                    <span className={`text-[9px] ${t.muted}`}>· {runDuration(run)}</span>
                                  )}
                                </div>
                                <div className={`text-[9px] ${t.muted}`}>{timeAgo(run.created_at)}</div>
                              </div>
                              <a
                                href={run.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-blue-500 hover:text-blue-400"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            {changes && changes.length > 0 && (
                              <div className={`ml-5 mb-1 p-1.5 rounded text-[9px] font-mono leading-relaxed ${t.input}`}>
                                {changes.map((line, i) => {
                                  const isRate = line.includes('Árfolyam') || line.includes('€');
                                  return (
                                    <div key={i} className={isRate ? 'text-blue-400' : ''}>
                                      {line}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {scraping && runs.length === 0 && !devOutput && (
                    <p className={`text-[9px] ${t.muted}`}>Workflow indítása folyamatban...</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={`p-3 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className={`font-bold text-[10px] uppercase tracking-wider mb-1.5 ${t.muted}`}>Amiket frissít:</h4>
            <ul className={`text-[10px] space-y-1 ${t.muted}`}>
              <li>• Midea árak — midea.hu webshopból</li>
              <li>• Fisher árak — fisherklima.hu webshopból</li>
              <li>• Panasonic árak — Klíma Centrum EUR listaár × árfolyam</li>
              <li>• EUR/HUF árfolyam — MNB közép + 1,3%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
