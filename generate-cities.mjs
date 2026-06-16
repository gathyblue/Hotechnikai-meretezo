import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hu = require('hu-postal-codes');

const cities = Array.from(new Set(hu.map(z => z.city)));
const sorted = cities.map(c => c.trim()).filter(c => c.length > 2 && !c.match(/^[0-9]/)).sort((a,b) => a.localeCompare(b, 'hu'));

const lines = sorted.map(c => {
       const lowerCity = c.toLowerCase();
       let temp = -13;
       if (lowerCity.includes('miskolc') || lowerCity.includes('nyíregyháza') || lowerCity.includes('debrecen') || lowerCity.includes('eger') || lowerCity.includes('salgótarján') || lowerCity.includes('békéscsaba') || lowerCity.includes('borsod') || lowerCity.includes('szabolcs') || lowerCity.includes('hajdú') || lowerCity.includes('zemplén') || lowerCity.includes('abaúj') || lowerCity.includes('kazincbarcika') || lowerCity.includes('óz') || lowerCity.includes('sátoraljaújhely')) {
         temp = -15;
       }
       if (lowerCity.includes('szombathely') || lowerCity.includes('zalaegerszeg') || lowerCity.includes('sopron') || lowerCity.includes('nagykanizsa') || lowerCity.includes('kőszeg') || lowerCity.includes('vas') || lowerCity.includes('zala') || lowerCity.includes('győr') || lowerCity.includes('mosonmagyaróvár') || lowerCity.includes('szentgotthárd') || lowerCity.includes('körmend') || lowerCity.includes('pilis')) {
         temp = -11;
       }
       if (lowerCity.includes('budapest') || lowerCity.includes('pilisborosjenő') || lowerCity.includes('pest') || lowerCity.includes('szentendre') || lowerCity.includes('dunakeszi') || lowerCity.includes('göd') || lowerCity.includes('vác')) {
         temp = -13;
       }
       return `{ name: "${c.replace(/"/g, '\\"')}", temp: ${temp} }`;
});

fs.writeFileSync('src/data/settlements.ts', `export const HUNGARIAN_CITIES = [\n  ${lines.join(',\n  ')}\n];\n`);
