import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:\\Users\\gathy\\Projects\\Hotechnikai-meretezo';

// Panasonic EUR nettó árak a Klíma Centrum árlistából (2026.01.26) + MNB közép + 1,3% = vállalati deviza eladás
const PANASONIC_EUR: Record<string, { eur: number; sku: string; components: string }> = {
  'panasonic-l-05': { eur: 5046, sku: 'WH-WDG05LE5+WH-SDC0509L3E5', components: 'WH-WDG05LE5 (kültéri 3.227€) + WH-SDC0509L3E5 (bi-bloc beltéri 1.819€)' },
  'panasonic-l-07': { eur: 5623, sku: 'WH-WDG07LE5+WH-SDC0509L3E5', components: 'WH-WDG07LE5 (kültéri 3.804€) + WH-SDC0509L3E5 (bi-bloc beltéri 1.819€)' },
  'panasonic-l-09': { eur: 6166, sku: 'WH-WDG09LE5+WH-SDC0509L3E5', components: 'WH-WDG09LE5 (kültéri 4.347€) + WH-SDC0509L3E5 (bi-bloc beltéri 1.819€)' },
  'panasonic-09':  { eur: 6900, sku: 'WH-WXG09ME8+CZ-RTW2TAW1C', components: 'WH-WXG09ME8 (kültéri 6.549€) + CZ-RTW2TAW1C (távirányító 351€)' },
  'panasonic-12':  { eur: 7343, sku: 'WH-WXG12ME8+CZ-RTW2TAW1C', components: 'WH-WXG12ME8 (kültéri 6.992€) + CZ-RTW2TAW1C (távirányító 351€)' },
  'panasonic-16':  { eur: 7878, sku: 'WH-WXG16ME8+CZ-RTW2TAW1C', components: 'WH-WXG16ME8 (kültéri 7.527€) + CZ-RTW2TAW1C (távirányító 351€)' },
};

// Midea & Fisher webshop URL-ek
const SOURCES: Record<string, { urls: string[]; parse: (html: string) => number }> = {
  'midea': {
    urls: [
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/midea-m-thermal-r290/products/mhc-v4wd2n7-e30-monoblokkos-m-thermal-r290-4-kw-1-fazis-cmid002748',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/midea-m-thermal-r290/products/mhc-v6wd2n7-e30-monoblokkos-m-thermal-r290-6-kw-1-fazis-cmid002749',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v8wd2n7-b-monoblokkos-m-thermal-r290-8-kw-1-fazis-cmid003024',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v8wd2rn7-b-monoblokkos-m-thermal-r290-8-kw-3-fazis-cmid003029',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v10wd2rn7-b-monoblokkos-m-thermal-r290-10-kw-1-fazis-cmid003025',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v10wd2rn7-b-monoblokkos-m-thermal-r290-10-kw-3-fazis-cmid003030',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v12wd2n7-b-monoblokkos-m-thermal-r290-12-kw-1-fazis-cmid003026',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v12wd2rn7-b-monoblokkos-m-thermal-r290-12-kw-3-fazis-cmid003031',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v16wd2rn7-b-monoblokkos-m-thermal-r290-16-kw-1-fazis-cmid003028',
      'https://midea.hu/category/levego-viz-hoszivattyuk/brand/nature/products/mhc-v16wd2rn7-b-monoblokkos-m-thermal-r290-16-kw-3-fazis-cmid003032',
    ],
    parse(html: string) {
      const m = html.match(/Ajánlott\s+fogyasztói\s+ár.*?<span[^>]*>([\d\s]+)\s*Ft/i);
      if (!m) throw new Error('Nem található Midea ár');
      return parseInt(m[1].replace(/\s/g, ''), 10);
    }
  },
  'fisher': {
    urls: [
      'https://www.fisherklima.hu/termekek/hoszivattyu-berendezesek/monoblokk-hoszivattyu/fisher-aquanova-leveg%C5%91-v%C3%ADz-monoblokk-h%C5%91szivatty%C3%BA-8-k-1-adatlap',
      'https://www.fisherklima.hu/termekek/hoszivattyu-berendezesek/monoblokk-hoszivattyu/fisher-aquanova-leveg%C5%91-v%C3%ADz-monoblokk-h%C5%91szivatty%C3%BA-10-kw-1-adatlap',
      'https://www.fisherklima.hu/termekek/hoszivattyu-berendezesek/monoblokk-hoszivattyu/fisher-aquanova-leveg%C5%91-v%C3%ADz-monoblokk-h%C5%91szivatty%C3%BA-12-kw-adatlap',
      'https://www.fisherklima.hu/termekek/hoszivattyu-berendezesek/monoblokk-hoszivattyu/fisher-aquanova-leveg%C5%91-v%C3%ADz-monoblokk-h%C5%91szivatty%C3%BA-12-kw-1-adatlap',
      'https://www.fisherklima.hu/termekek/hoszivattyu-berendezesek/monoblokk-hoszivattyu/fisher-aquanova-leveg%C5%91-v%C3%ADz-monoblokk-h%C5%91szivatty%C3%BA-14-kw-adatlap',
    ],
    parse(html: string) {
      const m = html.match(/Ajánlott\s+bruttó\s+fogyasztói\s+ár.*?PricesalesPrice[^>]*>([\d.]+)\s*Ft/i);
      if (!m) throw new Error('Nem található Fisher ár');
      return parseInt(m[1].replace(/\./g, ''), 10);
    }
  }
};

type PriceMap = Record<string, number>;

// MNB hivatalos EUR/HUF középárfolyam + 1,3% a vállalati deviza eladási árhoz
// (A Raiffeisen vállalati deviza eladási árfolyam JS-sel töltődik, nem scrapelhető.)
async function fetchEurRate(): Promise<{ rate: number; date: string }> {
  const res = await fetch('https://www.mnb.hu/arfolyamok', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  // Táblázatban: EUR | <árfolyam> | ...
  const m = html.match(/EUR[\s\S]{0,200}?(\d[\d ]+,\d+)/);
  if (!m) throw new Error('Nem sikerült lekérni az MNB árfolyamot');
  const rate = parseFloat(m[1].replace(/ /g, '').replace(',', '.')) * 1.013;
  const today = new Date().toISOString().slice(0, 10);
  return { rate: Math.round(rate * 100) / 100, date: today };
}

async function fetchWebshopPrices(): Promise<PriceMap> {
  const prices: PriceMap = {};
  const idMapping: Record<string, string> = {
    'midea-0': 'midea-arctic-04',
    'midea-1': 'midea-arctic-06',
    'midea-2': 'midea-08-1',
    'midea-3': 'midea-08-3',
    'midea-4': 'midea-10-1',
    'midea-5': 'midea-10-3',
    'midea-6': 'midea-12-1',
    'midea-7': 'midea-12-3',
    'midea-8': 'midea-16-1',
    'midea-9': 'midea-16-3',
    'fisher-0': 'fisher-08',
    'fisher-1': 'fisher-10',
    'fisher-2': 'fisher-12-1',
    'fisher-3': 'fisher-12-3',
    'fisher-4': 'fisher-14',
  };

  for (const [source, config] of Object.entries(SOURCES)) {
    for (let i = 0; i < config.urls.length; i++) {
      const url = config.urls[i];
      const key = `${source}-${i}`;
      const id = idMapping[key];
      if (!id) continue;

      process.stdout.write(`  ${source} #${i} (${id})... `);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PriceScraper/1.0)' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const price = config.parse(html);
        prices[id] = price;
        console.log(`${price.toLocaleString('hu-HU')} Ft`);
      } catch (err) {
        console.error(`HIBA: ${err}`);
      }
    }
  }
  return prices;
}

function updateTsFile(prices: PriceMap, eurRate: number, rateDate: string) {
  const filePath = `${BASE}/src/heatPumpData.ts`;
  let content = readFileSync(filePath, 'utf-8');

  const updates: string[] = [];

  // 1. Midea & Fisher árak (webshopból)
  for (const [id, price] of Object.entries(prices)) {
    const re = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?estimatedPriceHuf:\\s*)(\\d+)`, '');
    const match = content.match(re);
    if (match) {
      const oldPrice = parseInt(match[2], 10);
      if (oldPrice !== price) {
        content = content.replace(match[0], match[0].replace(match[2], String(price)));
        updates.push(`${id}: ${oldPrice.toLocaleString('hu-HU')} -> ${price.toLocaleString('hu-HU')} Ft`);
      } else {
        updates.push(`${id}: változatlan (${price.toLocaleString('hu-HU')} Ft)`);
      }
    } else {
      updates.push(`${id}: NEM TALÁLHATÓ`);
    }
  }

  // 2. Panasonic EUR árak átszámolva
  const vatMultiplier = 1.27; // 27% ÁFA
  for (const [id, info] of Object.entries(PANASONIC_EUR)) {
    const hufPrice = Math.round(info.eur * eurRate * vatMultiplier);

    // Frissítse estimatedPriceHuf
    const priceRe = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?estimatedPriceHuf:\\s*)(\\d+)`, '');
    const priceMatch = content.match(priceRe);
    if (priceMatch) {
      const oldPrice = parseInt(priceMatch[2], 10);
      if (oldPrice !== hufPrice) {
        content = content.replace(priceMatch[0], priceMatch[0].replace(priceMatch[2], String(hufPrice)));
        updates.push(`${id}: ${oldPrice.toLocaleString('hu-HU')} -> ${hufPrice.toLocaleString('hu-HU')} Ft (${info.eur} € × ${eurRate} × 1,27)`);
      } else {
        updates.push(`${id}: változatlan (${hufPrice.toLocaleString('hu-HU')} Ft)`);
      }
    } else {
      updates.push(`${id}: NEM TALÁLHATÓ`);
    }

    // Frissítse lastPriceUpdate
    const dateRe = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?lastPriceUpdate:\\s*)'[^']*'`, '');
    const dateMatch = content.match(dateRe);
    if (dateMatch) {
      content = content.replace(dateMatch[0], dateMatch[1] + `'${rateDate}'`);
    }
  }

  writeFileSync(filePath, content, 'utf-8');

  console.log('\n=== Frissítési eredmény ===');
  updates.forEach(u => console.log(u));
  console.log(`\nÁrfolyam: 1 € = ${eurRate} Ft (${rateDate}, MNB közép + 1,3%)`);
  console.log('===========================\n');
}

async function main() {
  console.log('=== Árfrissítő script ===\n');

  // 1. Raiffeisen árfolyam
  console.log('EUR/HUF árfolyam lekérése (MNB közép + 1,3% = vállalati deviza eladási)...');
  let eurRate = 0;
  let rateDate = '';
  try {
    const ecb = await fetchEurRate();
    eurRate = ecb.rate;
    rateDate = ecb.date;
    console.log(`  1 € = ${eurRate} Ft (${rateDate}, MNB közép + 1,3%)\n`);
  } catch (err) {
    console.error(`  HIBA: ${err} - használom a 359,00-es tartalék árfolyamot\n`);
    eurRate = 359.00;
    rateDate = new Date().toISOString().slice(0, 10);
  }

  // 2. Midea & Fisher árak
  console.log('Midea & Fisher árak lekérése webshopokból:');
  const prices = await fetchWebshopPrices();

  // 3. Panasonic árak hozzáadása (EUR alapú)
  console.log('\nPanasonic árak számolása EUR-ból:');
  for (const [id, info] of Object.entries(PANASONIC_EUR)) {
    const huf = Math.round(info.eur * eurRate * 1.27);
    prices[id] = huf;
    console.log(`  ${id}: ${info.eur} € → ${huf.toLocaleString('hu-HU')} Ft (${info.sku})`);
  }

  if (Object.keys(prices).length === 0) {
    console.error('Nem sikerült egyetlen árat sem lekérni.');
    process.exit(1);
  }

  console.log(`\nÖsszesen: ${Object.keys(prices).length} ár`);
  updateTsFile(prices, eurRate, rateDate);
  console.log('Kész! Futtasd: npm run build a változtatások ellenőrzéséhez.');
}

main().catch(console.error);
