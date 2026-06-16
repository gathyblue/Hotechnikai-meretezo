import fs from 'fs';
import { HUNGARIAN_CITIES } from './src/data/settlements.ts';
import pc from 'hu-postal-codes';

const updated = HUNGARIAN_CITIES.map((c: any) => {
    let zipMatch = pc.find((p: any) => p.city.toLowerCase() === c.name.toLowerCase());
    let zip = zipMatch ? zipMatch.zip.toString() : "";
    if (c.name === "Budapest") zip = "1000";
    return { ...c, zip };
});

const content = `export const HUNGARIAN_CITIES = ${JSON.stringify(updated, null, 2)};

export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
}

export function getHungarianZipCode(cityName: string): string {
    const city = HUNGARIAN_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    return city && city.zip ? city.zip : "";
}
`;

fs.writeFileSync('src/data/settlements.ts', content);
