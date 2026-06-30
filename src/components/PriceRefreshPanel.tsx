import React, { useState } from 'react';
import { HEAT_PUMP_DATABASE } from '../heatPumpData';
import { X, RefreshCw } from 'lucide-react';

function formatPrice(price: number): string {
  return price.toLocaleString('hu-HU') + ' Ft';
}

function formatEur(price: number): string {
  return price.toLocaleString('hu-HU') + ' €';
}

interface PriceRefreshPanelProps {
  isDark: boolean;
  onClose: () => void;
}

export const PriceRefreshPanel: React.FC<PriceRefreshPanelProps> = ({ isDark, onClose }) => {
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const mideaModels = HEAT_PUMP_DATABASE.filter(hp => hp.manufacturer === 'Midea');
  const fisherModels = HEAT_PUMP_DATABASE.filter(hp => hp.manufacturer === 'Fisher');
  const panasonicModels = HEAT_PUMP_DATABASE.filter(hp => hp.manufacturer === 'Panasonic');

  const allSkus: Record<string, string> = {
    'panasonic-l-05': 'WH-WDG05LE5 + WH-SDC0509L3E5',
    'panasonic-l-07': 'WH-WDG07LE5 + WH-SDC0509L3E5',
    'panasonic-l-09': 'WH-WDG09LE5 + WH-SDC0509L3E5',
    'panasonic-09': 'WH-WXG09ME8 + CZ-RTW2TAW1C',
    'panasonic-12': 'WH-WXG12ME8 + CZ-RTW2TAW1C',
    'panasonic-16': 'WH-WXG16ME8 + CZ-RTW2TAW1C',
    'midea-arctic-04': 'MHC-V4WD2N7-E30',
    'midea-arctic-06': 'MHC-V6WD2N7-E30',
    'midea-08-1': 'MHC-V8WD2N7-B',
    'midea-08-3': 'MHC-V8WD2RN7-B',
    'midea-10-1': 'MHC-V10WD2RN7-B',
    'midea-10-3': 'MHC-V10WD2RN7-B',
    'midea-12-1': 'MHC-V12WD2N7-B',
    'midea-12-3': 'MHC-V12WD2RN7-B',
    'midea-16-1': 'MHC-V16WD2RN7-B',
    'midea-16-3': 'MHC-V16WD2RN7-B',
    'fisher-08': 'FA-08M',
    'fisher-10': 'FA-10M',
    'fisher-12-1': 'FA-12M-1',
    'fisher-12-3': 'FA-12M-3',
    'fisher-14': 'FA-14M-3',
  };

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const lastUpdate = panasonicModels.find(hp => hp.lastPriceUpdate)?.lastPriceUpdate;
  const lastRate = panasonicModels.find(hp => hp.eurPriceNetto)?.estimatedPriceHuf;
  const sampleEur = panasonicModels.find(hp => hp.eurPriceNetto)?.eurPriceNetto;
  const sampleHuf = panasonicModels.find(hp => hp.eurPriceNetto)?.estimatedPriceHuf;
  const inferredRate = sampleEur && sampleHuf ? Math.round(sampleHuf / sampleEur / 1.27) : null;

  async function handleScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch('/api/scrape-prices', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScrapeResult('Árak frissítve! Az oldal újratöltődik...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setScrapeResult('Hiba: ' + (data.error || 'ismeretlen'));
      }
    } catch (err: any) {
      console.error('Scrape error:', err);
      setScrapeResult('Hiba: ' + (err.message || String(err)));
    } finally {
      setScraping(false);
    }
  }

  const t = isDark
    ? { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-slate-100', muted: 'text-slate-400', input: 'bg-slate-950', hover: 'hover:bg-slate-800' }
    : { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800', muted: 'text-slate-500', input: 'bg-slate-50', hover: 'hover:bg-slate-100' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className={`relative w-full max-w-lg h-full shadow-2xl border-l flex flex-col ${t.bg} ${t.border} ${t.text}`}>
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
          {!isDev && (
            <div className={`p-3 rounded border ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300'}`}>
              <p className={`font-bold text-[11px] ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Csak fejlesztői módban működik</p>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                A gomb csak akkor működik, ha a Vite dev szerver fut a gépeden. Indítsd el a terminálban:
              </p>
              <code className={`block mt-1.5 p-1.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-900 text-amber-200' : 'bg-white text-amber-800'}`}>
                npx vite --host --port 5173
              </code>
            </div>
          )}

          {isDev && (
            <div className={`p-3 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-blue-50 border-blue-200'}`}>
              <p className="font-medium">Hogyan frissülnek az árak?</p>
              <p className={`text-[10px] mt-1 ${t.muted}`}>
                <strong>Egy gombnyomás</strong> — a Vite backend lekéri a webshop árakat (midea.hu, fisherklima.hu), az MNB árfolyamot (+1,3%), átszámolja a Panasonic EUR listaárakat, majd automatikusan újratölti az oldalt. A módosított árak a <code className="text-[9px] px-1 py-0.5 rounded bg-slate-700/50">heatPumpData.ts</code> fájlba kerülnek.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleScrape}
              disabled={scraping || !isDev}
              className={`w-full font-bold text-xs py-2.5 rounded shadow cursor-pointer transition-all flex items-center justify-center gap-2 ${
                scraping
                  ? 'bg-slate-500 text-slate-300 cursor-not-allowed'
                  : !isDev
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? 'Frissítés folyamatban... (30-60 mp)' : !isDev ? 'Nem elérhető — lásd fent' : 'Árak frissítése egy gombnyomásra'}
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
            <p className={`text-[9px] ${t.muted}`}>
              {isDev
                ? 'Lekéri a midea.hu, fisherklima.hu árakat + MNB közép + 1,3% árfolyamot, átszámolja a Panasonic EUR árakat, és automatikusan újratölti az oldalt.'
                : 'A funkció használatához indítsd el a Vite dev szervert lokálisan, vagy használd a GitHub Actions workflow-t.'}
            </p>
          </div>

          {lastUpdate && inferredRate && (
            <div className={`p-2 rounded border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={t.muted}>Árfolyam:</span>
                <span className="font-bold">1 € = {inferredRate} Ft</span>
                <span className={t.muted}>|</span>
                <span className={t.muted}>Utolsó frissítés:</span>
                <span className="font-bold">{lastUpdate}</span>
              </div>
              <p className={`text-[9px] mt-0.5 ${t.muted}`}>
                Forrás: MNB középárfolyam + 1,3% (becsült vállalati deviza eladás). Panasonic árak: Klíma Centrum Kft nettó EUR listaár × árfolyam × 1,27 (ÁFA).
              </p>
            </div>
          )}

          <div className={`border-t pt-3 ${t.border}`}>
            <h4 className={`font-bold text-[10px] uppercase tracking-wider mb-2 ${t.muted}`}>Jelenleg tárolt árak (bruttó HUF)</h4>

            <div className="space-y-2">
              <p className="font-semibold text-blue-400 text-[10px]">Midea — midea.hu</p>
              {mideaModels.map(hp => (
                <div key={hp.id} className={`p-1.5 rounded border ${t.border} ${t.input}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[220px]">{hp.name}</span>
                    <span className="font-mono font-bold whitespace-nowrap">{formatPrice(hp.estimatedPriceHuf)}</span>
                  </div>
                  <div className={`text-[9px] mt-0.5 ${t.muted}`}>SKU: {allSkus[hp.id]}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 mt-3">
              <p className="font-semibold text-green-400 text-[10px]">Fisher — fisherklima.hu</p>
              {fisherModels.map(hp => (
                <div key={hp.id} className={`p-1.5 rounded border ${t.border} ${t.input}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[220px]">{hp.name}</span>
                    <span className="font-mono font-bold whitespace-nowrap">{formatPrice(hp.estimatedPriceHuf)}</span>
                  </div>
                  <div className={`text-[9px] mt-0.5 ${t.muted}`}>SKU: {allSkus[hp.id]}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 mt-3">
              <p className="font-semibold text-orange-400 text-[10px]">Panasonic — Klíma Centrum árlista (EUR nettó → HUF bruttó)</p>
              {panasonicModels.map(hp => (
                <div key={hp.id} className={`p-1.5 rounded border ${t.border} ${t.input}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[200px]">{hp.name}</span>
                    <span className="font-mono font-bold whitespace-nowrap">{formatPrice(hp.estimatedPriceHuf)}</span>
                  </div>
                  {hp.eurPriceNetto && (
                    <div className={`flex items-center gap-2 text-[9px] mt-0.5 ${t.muted}`}>
                      <span>Nettó: {formatEur(hp.eurPriceNetto)}</span>
                      <span>|</span>
                      <span>SKU: {allSkus[hp.id]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
