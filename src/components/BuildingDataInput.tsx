import React, { useMemo, useState, useRef, useEffect } from 'react';
import { getThemeClasses } from '../utils/theme';
import { BuildingData } from '../types';
import { Flame, Layers, ShieldAlert, Sliders, User, MapPin, Calendar } from 'lucide-react';
import { calculateGasHufCost, calculateGasM3FromHuf, performHeatLossCalculation } from '../utils/calculations';
import { HUNGARIAN_CITIES, getHungarianZipCode, removeAccents } from '../data/settlements';
import { SegmentedControl } from './SegmentedControl';

// Heuristic to get recommended design temp
const getRecommendedTemp = (city: string): number => {
  if (!city) return -13; // default
  const lowerCity = city.toLowerCase();
  
  if (lowerCity.includes('miskolc') || lowerCity.includes('nyíregyháza') || lowerCity.includes('debrecen') || lowerCity.includes('eger') || lowerCity.includes('salgótarján') || lowerCity.includes('békéscsaba') || lowerCity.includes('borsod') || lowerCity.includes('szabolcs') || lowerCity.includes('hajdú')) {
    return -15;
  }
  
  if (lowerCity.includes('szombathely') || lowerCity.includes('zalaegerszeg') || lowerCity.includes('sopron') || lowerCity.includes('nagykanizsa') || lowerCity.includes('kőszeg') || lowerCity.includes('vas') || lowerCity.includes('zala') || lowerCity.includes('győr') || lowerCity.includes('mosonmagyaróvár')) {
    return -11;
  }
  
  return -13; // default for most of Hungary
};

export const CONSTRUCTION_YEAR_GROUPS = [
  {
    id: '<1980',
    label: '1980 előtt',
    description: 'Kisméretű tégla (1.45), szig. nélkül (0cm), régi ablak (3.0)',
    walls: { baseUValue: 1.45, insulationThickness: 0 },
    roof: { baseUValue: 1.1, insulationThickness: 0 },
    floor: { baseUValue: 0.9, insulationThickness: 0 },
    windows: { uValue: 3.0 },
    ventilationRate: 0.8,
    typicalGasM3PerM2: 28,
    typicalCertQ: 1.20,
  },
  {
    id: '1980-1990',
    label: '1980 - 1990',
    description: 'B30 blokktégla (1.50), szig. nélkül (0cm), 2-rétegű régi ablak (2.8)',
    walls: { baseUValue: 1.50, insulationThickness: 0 },
    roof: { baseUValue: 1.1, insulationThickness: 0 },
    floor: { baseUValue: 0.9, insulationThickness: 0 },
    windows: { uValue: 2.8 },
    ventilationRate: 0.5,
    typicalGasM3PerM2: 25,
    typicalCertQ: 1.00,
  },
  {
    id: '1991-2001',
    label: '1991 - 2001',
    description: 'Szilikát/Poroton (1.20), kevés EPS (5cm), kétrétegű ablak (2.8)',
    walls: { baseUValue: 1.20, insulationThickness: 5 },
    roof: { baseUValue: 1.1, insulationThickness: 10 },
    floor: { baseUValue: 0.9, insulationThickness: 5 },
    windows: { uValue: 2.8 },
    ventilationRate: 0.5,
    typicalGasM3PerM2: 18,
    typicalCertQ: 0.75,
  },
  {
    id: '2002-2015',
    label: '2002 - 2015',
    description: 'Porotherm 30 (0.55), EPS 8cm, modern 2-rétegű ablak (1.5)',
    walls: { baseUValue: 0.55, insulationThickness: 8 },
    roof: { baseUValue: 1.3, insulationThickness: 15 },
    floor: { baseUValue: 0.9, insulationThickness: 5 },
    windows: { uValue: 1.5 },
    ventilationRate: 0.5,
    typicalGasM3PerM2: 12,
    typicalCertQ: 0.45,
  },
  {
    id: '2016-2020',
    label: '2016 - 2020',
    description: 'Porotherm 30 (0.55), EPS 12cm, standard 3-rétegű ablak (1.1)',
    walls: { baseUValue: 0.55, insulationThickness: 12 },
    roof: { baseUValue: 1.3, insulationThickness: 20 },
    floor: { baseUValue: 0.9, insulationThickness: 10 },
    windows: { uValue: 1.1 },
    ventilationRate: 0.5,
    typicalGasM3PerM2: 8,
    typicalCertQ: 0.30,
  },
  {
    id: '2021-',
    label: '2021 után (Korszerű / Új)',
    description: 'Porotherm 30 (0.55), EPS 15cm, prémium 3-rétegű ablak (0.7)',
    walls: { baseUValue: 0.55, insulationThickness: 15 },
    roof: { baseUValue: 0.8, insulationThickness: 25 },
    floor: { baseUValue: 0.6, insulationThickness: 15 },
    windows: { uValue: 0.7 },
    ventilationRate: 0.3,
    typicalGasM3PerM2: 5,
    typicalCertQ: 0.18,
  },
];

interface BuildingDataInputProps {
  data: BuildingData;
  onChange: (data: BuildingData) => void;
  theme?: 'light' | 'dark';
}

export const BuildingDataInput: React.FC<BuildingDataInputProps> = ({ data, onChange, theme = 'light' }) => {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const cityInputRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (data.location) {
      setCitySearch(data.location);
    }
  }, [data.location]);

  const updateField = (field: keyof BuildingData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const selectCity = (cityName: string, cityTemp: number) => {
    const typedZipMatch = citySearch.match(/^(\d{4})/);
    const zip = typedZipMatch ? typedZipMatch[1] : getHungarianZipCode(cityName);
    const fullLoc = zip ? `${zip} ${cityName}` : cityName;
    onChange({
      ...data,
      location: fullLoc,
      designTemp: cityTemp
    });
    setCitySearch(fullLoc);
    setShowCityDropdown(false);
  };

  const updateStructure = (structureKey: 'walls' | 'roof' | 'floor' | 'windows', field: string, value: any) => {
    const updatedStructure = { ...data[structureKey], [field]: value };
    onChange({ ...data, [structureKey]: updatedStructure });
  };

  const handleConstructionYearChange = (yearId: string) => {
    const preset = CONSTRUCTION_YEAR_GROUPS.find(g => g.id === yearId);
    if (!preset) return;
    onChange({
      ...data,
      constructionYearGroup: yearId,
      walls: { ...data.walls, baseUValue: preset.walls.baseUValue, insulationThickness: preset.walls.insulationThickness },
      roof: { ...data.roof, baseUValue: preset.roof.baseUValue, insulationThickness: preset.roof.insulationThickness },
      floor: { ...data.floor, baseUValue: preset.floor.baseUValue, insulationThickness: preset.floor.insulationThickness },
      windows: { ...data.windows, uValue: preset.windows.uValue },
      ventilationRate: preset.ventilationRate,
      gasAnnualM3: Math.round(preset.typicalGasM3PerM2 * data.heatedArea),
      certSpecificLossQ: preset.typicalCertQ,
    });
  };

  const handleDimensionsChange = (field: 'heatedArea' | 'levels' | 'ceilingHeight', val: number) => {
    const updated = {
      ...data,
      [field]: val
    };
    
    // Values
    const area = updated.heatedArea || 120;
    const lvls = updated.levels || 1;
    const height = updated.ceilingHeight || 2.7;
    
    // Area structure scaling ("ami terület"):
    // Padló (floor) and Födém (roof) area = footprint area = area / levels
    const footprintArea = Math.round(area / lvls);
    
    // Nyílászáró becslés ("saccoljon nyílászárót is"): 15% of heated area
    const windowArea = Math.round(area * 0.15);
    
    // Falazat ("ami kerület x magasság"):
    // Perimeter of footprint (square approximation): P = 4 * sqrt(footprintArea)
    // Wall area = P * ceilingHeight * levels
    const perimeter = 4 * Math.sqrt(footprintArea);
    const grossWallArea = Math.round(perimeter * height * lvls);
    
    // Update structural items in deep fields
    updated.floor = { ...data.floor, area: footprintArea };
    updated.roof = { ...data.roof, area: footprintArea };
    updated.windows = { ...data.windows, area: windowArea };
    updated.walls = { ...data.walls, area: grossWallArea };
    
    // If heatedArea changed and a construction year preset is active, sync gas & cert q
    if (field === 'heatedArea') {
      const preset = CONSTRUCTION_YEAR_GROUPS.find(g => g.id === data.constructionYearGroup);
      if (preset) {
        updated.gasAnnualM3 = Math.round(preset.typicalGasM3PerM2 * val);
        updated.certSpecificLossQ = preset.typicalCertQ;
      }
    }
    
    onChange(updated);
  };

  const isDark = theme === 'dark';
  const t = getThemeClasses(isDark);

  const recommendedTemp = useMemo(() => getRecommendedTemp(data.location), [data.location]);

  // Compute live comparison values across all methods
  const calcResults = performHeatLossCalculation(data);
  const { gasKw = 0, fabricKw = 0, certKw = 0 } = calcResults.comparison || {};

  return (
    <div className="space-y-4" id="building-data-form">
      {/* 1. Ingatlan alapadatai */}
      <div className={`rounded-lg border p-3 transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="border-b pb-1.5">
          <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Ingatlan alapadatai
          </h3>
        </div>
        <div className="mt-3">
        {/* Owner Name, Date, City and Property Address */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 ${isDark ? '' : ''}`}>
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <User className="w-3.5 h-3.5 text-slate-400" />
              Tulajdonos neve
            </label>
            <input
              type="text"
              value={data.ownerName || ''}
              onChange={(e) => updateField('ownerName', e.target.value)}
              placeholder="Pl. Kis Péter"
              className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Felmérés dátuma
            </label>
            <input
              type="date"
              value={data.surveyDate || ''}
              onChange={(e) => updateField('surveyDate', e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="space-y-1 relative" ref={cityInputRef}>
            <label className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Település (Város)
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.location || ''}
                onKeyDown={(e) => {
                  if (!showCityDropdown) return;
                  const cleanSearch = removeAccents(citySearch.replace(/^\d{4}\s+/, "").trim().toLowerCase());
                  const items = HUNGARIAN_CITIES.filter(c => {
                    if (cleanSearch.length < 2) return true;
                    return removeAccents(c.name.toLowerCase()).includes(cleanSearch);
                  }).slice(0, 50);
                  
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = Math.min(focusedIndex + 1, items.length - 1);
                    setFocusedIndex(next);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = Math.max(focusedIndex - 1, 0);
                    setFocusedIndex(prev);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (focusedIndex >= 0 && items[focusedIndex]) {
                      selectCity(items[focusedIndex].name, items[focusedIndex].temp);
                    } else {
                      setShowCityDropdown(false);
                    }
                  } else if (e.key === 'Escape') {
                    setShowCityDropdown(false);
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setCitySearch(val);
                  updateField('location', val);
                  setShowCityDropdown(true);
                  setFocusedIndex(-1);
                  
                  const cleanVal = removeAccents(val.replace(/^\d{4}\s+/, "").trim().toLowerCase());
                  const match = HUNGARIAN_CITIES.find(c => removeAccents(c.name.toLowerCase()) === cleanVal);
                  if (match) {
                    updateField('designTemp', match.temp);
                  }
                }}
                placeholder="Pl. 6000 Kecskemét"
                className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              {showCityDropdown && (
                <div className={`absolute z-50 w-full mt-1 max-h-48 overflow-y-auto border rounded-lg shadow-lg ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {(() => {
                    const cleanSearch = removeAccents(citySearch.trim().toLowerCase());
                    const filtered = HUNGARIAN_CITIES.filter((c: any) => {
                      if (cleanSearch.length < 2) return true;
                      return removeAccents(c.name.toLowerCase()).includes(cleanSearch) || 
                             (c.zip && c.zip.includes(cleanSearch));
                    }).slice(0, 50);
                    return (
                      <>
                        {filtered.map((c, idx) => (
                          <div 
                            key={c.name}
                            onMouseEnter={() => {
                              setFocusedIndex(idx);
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                              selectCity(c.name, c.temp);
                            }}
                            className={`px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center ${
                              idx === focusedIndex 
                                 ? (isDark ? 'bg-slate-800 text-white' : 'bg-blue-100 text-slate-900')
                                 : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100')
                            }`}
                          >
                            <span className="font-semibold">{getHungarianZipCode(c.name) ? `${getHungarianZipCode(c.name)} ` : ""}{c.name}</span>
                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.temp} °C</span>
                          </div>
                        ))}
                        {filtered.length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400 italic">Nincs találat</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Ingatlan pontos címe
            </label>
            <input
              type="text"
              value={data.address || ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Pl. Petőfi Sándor u. 12."
              className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>
        </div>

        {/* Global Sizing Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3">
          {/* Heated Area */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fűtött alapterület</label>
            <div className="relative">
              <input
                type="number"
                min="10"
                max="1000"
                value={data.heatedArea || ''}
                onChange={(e) => handleDimensionsChange('heatedArea', Number(e.target.value))}
                className={`w-full pl-2 pr-6 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-bold font-mono ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200/80 text-slate-850'
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">m²</span>
            </div>
          </div>

          {/* Levels (Épület szintjei) */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Épület szintjei</label>
            <SegmentedControl
              options={[
                { value: 1, label: '1 szint' },
                { value: 2, label: '2 szint' },
                { value: 3, label: '3 szint' },
                { value: 4, label: '4 szint' },
              ]}
              value={data.levels || 1}
              onChange={(val) => handleDimensionsChange('levels', val)}
              layoutId="building-levels"
              theme={theme as 'light' | 'dark'}
            />
          </div>

          {/* Average Ceiling Height */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Átlagos belmagasság</label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="1.5"
                max="6.0"
                value={data.ceilingHeight || ''}
                onChange={(e) => handleDimensionsChange('ceilingHeight', Number(e.target.value))}
                className={`w-full pl-2 pr-6 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-medium font-mono ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200/80 text-slate-850'
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">m</span>
            </div>
          </div>

          {/* Construction Year (Építés éve) */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Építés éve (Alapprofil)</label>
            <select
              value={data.constructionYearGroup || '2002-2015'}
              onChange={(e) => handleConstructionYearChange(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold appearance-none pr-8 bg-no-repeat bg-[length:14px] bg-[right_8px_center] ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200/80 text-slate-850'
              }`}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
            >
              {CONSTRUCTION_YEAR_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Temperature Discrete Choices — 2-col */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          {/* Design Indoor Temp buttons */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold uppercase block tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Belső tervezési hőmérséklet (T_belső)
            </label>
            <SegmentedControl
              options={[
                { value: 20, label: '20 °C' },
                { value: 22, label: '22 °C' },
                { value: 24, label: '24 °C' },
              ]}
              value={data.indoorTemp}
              onChange={(val) => updateField('indoorTemp', val)}
              layoutId="indoor-temp"
              theme={theme as 'light' | 'dark'}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>Nyugodt: 20°C</span>
              <span>Átlag: 22°C</span>
              <span>Fürdő/Gyer.: 24°C</span>
            </div>
          </div>

          {/* Design Outdoor Temp buttons */}
          <div className="space-y-1.5">
            <label className={`text-[10px] font-bold uppercase block tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Helyszíni mértékadó külső hőfok (T_külső)
            </label>
            <SegmentedControl
              options={[
                { value: -15, label: '-15 °C' },
                { value: -13, label: '-13 °C' },
                { value: -11, label: '-11 °C' },
              ]}
              value={data.designTemp}
              onChange={(val) => updateField('designTemp', val)}
              layoutId="design-temp"
              theme={theme as 'light' | 'dark'}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>Kelet-HU: -15°C</span>
              <span>Dél-HU: -13°C</span>
              <span>Nyugat-HU: -11°C</span>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 2. Hőigény meghatározás */}
      <div className={`rounded-lg border p-3 transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="border-b pb-1.5">
          <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Hőigény meghatározás
          </h3>
        </div>
        <div className="mt-3">

        {/* Method Selection Tabs */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Hőigény meghatározási módszer kiválasztása (Szerkesztéshez)
          </label>
          <SegmentedControl
            options={[
              {
                value: 'gas',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    Gáz
                  </span>
                ),
              },
              {
                value: 'fabric',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Szerkezet
                  </span>
                ),
              },
              {
                value: 'certificate',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    Tanúsítvány
                  </span>
                ),
              },
            ]}
            value={data.method}
            onChange={(val) => onChange({ ...data, method: val })}
            layoutId="calc-method"
            theme={theme as 'light' | 'dark'}
          />

          {/* METHOD 1: GAS-BASED WITH BIDIRECTIONAL Live SYNC */}
          {data.method === 'gas' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`rounded-lg border p-2.5 ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Éves gázfogyasztás
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="15000"
                    value={data.gasAnnualM3 || ''}
                    onChange={(e) => {
                      onChange({
                        ...data,
                        gasCalculationSource: 'm3',
                        gasAnnualM3: Number(e.target.value)
                      });
                    }}
                    className={`w-full pl-2 pr-12 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-bold font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    placeholder="pl. 1600"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">m³/év</span>
                </div>
              </div>
              </div>

              <div className={`rounded-lg border p-2.5 ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Éves gázköltség
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={(() => {
                      if (data.gasCalculationSource === 'annual_huf' && data.gasAnnualHuf !== undefined) return data.gasAnnualHuf;
                      return Math.round(calculateGasHufCost(data.gasAnnualM3)) || '';
                    })()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                         updateField('gasAnnualM3', 0);
                         return;
                      }
                      const huf = Number(val);
                      const computedM3 = calculateGasM3FromHuf(huf);
                      onChange({
                        ...data,
                        gasCalculationSource: 'annual_huf',
                        gasAnnualHuf: huf,
                        gasAnnualM3: Number(computedM3.toFixed(1))
                      });
                    }}
                    onBlur={() => updateField('gasCalculationSource', 'm3')}
                    className={`w-full pl-2 pr-12 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-bold font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    placeholder="pl. 175493"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">Ft/év</span>
                </div>
              </div>
              </div>

              <div className={`rounded-lg border p-2.5 ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Havi átalány
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={(() => {
                      if (data.gasCalculationSource === 'monthly_huf' && data.gasMonthlyHuf !== undefined) return data.gasMonthlyHuf;
                      return Math.round(calculateGasHufCost(data.gasAnnualM3) / 12) || '';
                    })()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                         updateField('gasAnnualM3', 0);
                         return;
                      }
                      const huf = Number(val) * 12;
                      const computedM3 = calculateGasM3FromHuf(huf);
                      onChange({
                        ...data,
                        gasCalculationSource: 'monthly_huf',
                        gasMonthlyHuf: Number(val),
                        gasAnnualM3: Number(computedM3.toFixed(1))
                      });
                    }}
                    onBlur={() => updateField('gasCalculationSource', 'm3')}
                    className={`w-full pl-2 pr-12 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-bold font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                    placeholder="pl. 14600"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">Ft/hó</span>
                </div>
              </div>
              </div>
              
              <div className={`rounded-lg border p-2.5 md:col-span-3 ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!data.gasIncludeDhwCorrection}
                    onChange={(e) => updateField('gasIncludeDhwCorrection', e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex flex-col">
                    <span className={`text-[12px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      A számla tartalmaz melegvíz-előállítást is (Korrekció a fűtési hőszükséglethez)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">A melegvíz levonásra kerül a becsült fűtési hőszükségletből (fogyasztástól függően 10-30%)</span>
                  </div>
                </label>
              </div>

              <div className={`rounded-lg border p-2.5 md:col-span-3 ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lecserélésre kerülő meglévő gázkazán típusa
                </label>
                <select
                  value={data.gasBoilerType || 'old_atmospheric'}
                  onChange={(e) => {
                    const val = e.target.value;
                    let eff = 70;
                    if (val === 'old_atmospheric') eff = 70;
                    if (val === 'new_atmospheric') eff = 82;
                    if (val === 'condensing') eff = 95;
                    
                    onChange({
                      ...data,
                      gasBoilerType: val as any,
                      boilerEfficiency: eff
                    });
                  }}
                  className={`w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold appearance-none pr-8 bg-no-repeat bg-[length:14px] bg-[right_8px_center] ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
                >
                  <option value="old_atmospheric">Régi atmoszférikus (kéményes) kazán – kb. 70% hatásfok</option>
                  <option value="new_atmospheric">Zárt égésterű (turbós) kazán – kb. 82% hatásfok</option>
                  <option value="condensing">Kondenzációs kazán – kb. 95% hatásfok</option>
                </select>
              </div>
            </div>
          )}

          {/* METHOD 2: STRUCTURES (FABRIC) WITH DISCRETE BUTTON GROUPS */}
          {data.method === 'fabric' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-800">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                Méretezett szerkezeti elemek (Alapterület alapú predikcióval)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* WALLS */}
                <div className={`p-2.5 rounded-lg border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center pb-1 border-b border-dashed border-slate-800/20">
                    <span className="font-bold text-slate-400">Külső falazat (bruttó, ablakokkal együtt)</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Felület:</span>
                      <input
                        type="number"
                        value={data.walls.area || 0}
                        onChange={(e) => updateStructure('walls', 'area', Number(e.target.value))}
                        className={`w-14 px-1 py-1.5 border rounded-lg text-right font-mono text-[10px] font-bold ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-300'}`}
                      />
                      <span className="text-[9px] text-slate-500 font-bold">m²</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold leading-none mb-0.5">Fal szerkezet - Rétegrend bázis</span>
                      <select
                        value={data.walls.baseUValue}
                        onChange={(e) => updateStructure('walls', 'baseUValue', Number(e.target.value))}
                        className={`w-full px-1.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold appearance-none pr-8 bg-no-repeat bg-[length:14px] bg-[right_8px_center] ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'}`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
                      >
                        <option value={1.45}>Kisméretű tömör tégla (38cm) - U=1.45</option>
                        <option value={1.50}>B30-as blokktégla (30cm) - U=1.50</option>
                        <option value={1.20}>Szilikát (30cm) - U=1.20</option>
                        <option value={0.55}>Porotherm 30 N+F - U=0.55</option>
                        <option value={0.25}>Porotherm 38 K (Klímatégla) - U=0.25</option>
                        <option value={1.80}>Beton / Panelfal - U=1.80</option>
                        <option value={1.30}>Vályogfal (50cm) - U=1.30</option>
                      </select>
                    </div>
                    
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mt-1">Homlokzati EPS Szigetelés (cm)</span>
                      <div className="mt-0.5">
                        <SegmentedControl
                          options={[0, 5, 8, 10, 12, 15, 20].map(v => ({ value: v, label: String(v) }))}
                          value={data.walls.insulationThickness}
                          onChange={(val) => updateStructure('walls', 'insulationThickness', val)}
                          layoutId="wall-insulation"
                          theme={theme as 'light' | 'dark'}
                          className="text-[8px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROOF */}
                <div className={`p-2.5 rounded-lg border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center pb-1 border-b border-dashed border-slate-800/20">
                    <span className="font-bold text-slate-400">Födém / Tető</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Felület:</span>
                      <input
                        type="number"
                        value={data.roof.area || 0}
                        onChange={(e) => updateStructure('roof', 'area', Number(e.target.value))}
                        className={`w-14 px-1 py-1.5 border rounded-lg text-right font-mono text-[10px] font-bold ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-300'}`}
                      />
                      <span className="text-[9px] text-slate-500 font-bold">m²</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold leading-none mb-0.5">Födém alap-U (szigetelés nélkül)</span>
                      <select
                        value={data.roof.baseUValue}
                        onChange={(e) => updateStructure('roof', 'baseUValue', Number(e.target.value))}
                        className={`w-full px-1.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold appearance-none pr-8 bg-no-repeat bg-[length:14px] bg-[right_8px_center] ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'}`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
                      >
                        <option value={1.3}>Vasbeton tálcás / béléstest (U=1.3)</option>
                        <option value={1.1}>Fagerendás sárfödém / salakos (U=1.1)</option>
                        <option value={0.8}>Könnyűszerkezet (U=0.8)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold mt-1">Gyapot Hőszigetelés (cm)</span>
                      <div className="mt-0.5">
                        <SegmentedControl
                          options={[0, 10, 15, 20, 25, 30].map(v => ({ value: v, label: String(v) }))}
                          value={data.roof.insulationThickness}
                          onChange={(val) => updateStructure('roof', 'insulationThickness', val)}
                          layoutId="roof-insulation"
                          theme={theme as 'light' | 'dark'}
                          className="text-[8px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* FLOOR */}
                <div className={`p-2.5 rounded-lg border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center pb-1 border-b border-dashed border-slate-800/20">
                    <span className="font-bold text-slate-400">Padló / Aljzat</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Felület:</span>
                      <input
                        type="number"
                        value={data.floor.area || 0}
                        onChange={(e) => updateStructure('floor', 'area', Number(e.target.value))}
                        className={`w-14 px-1 py-1.5 border rounded-lg text-right font-mono text-[10px] font-bold ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-300'}`}
                      />
                      <span className="text-[9px] text-slate-500 font-bold">m²</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold leading-none mb-0.5">Aljzat alap-U (szigetelés nélkül)</span>
                      <select
                        value={data.floor.baseUValue}
                        onChange={(e) => updateStructure('floor', 'baseUValue', Number(e.target.value))}
                        className={`w-full px-1.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold appearance-none pr-8 bg-no-repeat bg-[length:14px] bg-[right_8px_center] ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'}`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
                      >
                        <option value={0.9}>Szigetelés nélküli beton (talajon) (U=0.9)</option>
                        <option value={1.1}>Fafödém pinceszint felett (U=1.1)</option>
                        <option value={0.6}>Kerámia / vékony szigeteltségi szint (U=0.6)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold mt-1">Aljazat alatti lépésálló / XPS (cm)</span>
                      <div className="mt-0.5">
                        <SegmentedControl
                          options={[0, 5, 8, 10, 15, 20].map(v => ({ value: v, label: String(v) }))}
                          value={data.floor.insulationThickness}
                          onChange={(val) => updateStructure('floor', 'insulationThickness', val)}
                          layoutId="floor-insulation"
                          theme={theme as 'light' | 'dark'}
                          className="text-[8px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* WINDOWS */}
                <div className={`p-2.5 rounded-lg border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center pb-1 border-b border-dashed border-slate-800/20">
                    <span className="font-bold text-slate-400">Nyílászárók (Ablakok)</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Felület:</span>
                      <input
                        type="number"
                        value={data.windows.area || 0}
                        onChange={(e) => updateStructure('windows', 'area', Number(e.target.value))}
                        className={`w-14 px-1 py-1.5 border rounded-lg text-right font-mono text-[10px] font-bold ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-300'}`}
                      />
                      <span className="text-[9px] text-slate-500 font-bold">m²</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold leading-none mb-0.5">Üvegezési tok- és rétegszerkezet (Uw)</span>
                      <select
                        value={data.windows.uValue}
                        onChange={(e) => updateStructure('windows', 'uValue', Number(e.target.value))}
                        className={`w-full px-1.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-semibold appearance-none pr-8 bg-no-repeat bg-[length:14px] bg-[right_8px_center] ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")` }}
                      >
                        <option value={3.0}>Egyrétegű fém v. gerébtokos fa (U=3.0)</option>
                        <option value={2.8}>Kétrétegű régi termo üvegezés (U=2.8)</option>
                        <option value={1.5}>Modern 2-rétegű műanyag tokos (U=1.5)</option>
                        <option value={1.1}>Standard 3-rétegű argon gázos (U=1.1)</option>
                        <option value={0.7}>Prémium 3-rétegű passzívház gázos (U=0.7)</option>
                        <option value={0.5}>Kiváló 3-rétegű high-tech (U=0.5)</option>
                      </select>
                    </div>
                    
                    <div className="pt-0.5 select-none flex items-center justify-between text-[8px] text-slate-500 font-medium">
                      <span>Automatikus 15%-os alapterület-becslés aktív</span>
                    </div>
                  </div>
                </div>

                {/* VENTILATION */}
                <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-3 text-xs ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="font-bold text-slate-500">Légcsere szám</span>
                  <div>
                    <SegmentedControl
                      options={[
                        { value: 0.3, label: '0.3/h (Hővisszanyerős szellőztetés)' },
                        { value: 0.5, label: '0.5/h (Normál üzem)' },
                        { value: 0.8, label: '0.8/h (Rosszul záró nyílászárók)' },
                      ]}
                      value={data.ventilationRate}
                      onChange={(val) => updateField('ventilationRate', val)}
                      layoutId="ventilation-rate"
                      theme={theme as 'light' | 'dark'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* METHOD 3: ENERGY CERTIFICATE WITH ZERO CONSTRAINT FREEDOM */}
          {data.method === 'certificate' && (
            <div className="space-y-3">
              <div className={`p-2.5 border rounded flex items-start gap-2 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                <ShieldAlert className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-normal font-semibold">
                  <strong>Energetikai Tanúsítvány mód:</strong> Ha a jegyzőkönyv tartalmazza a pontos méretezési hőszükségletet, írja be ide. Ha nincs megadva, vagy 0-t ad meg, az alábbi fajlagos veszteség (q-arány) alapján számolunk.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tervezési hőigény (0 is beírható)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={data.certHeatDemandKw === 0 ? '0' : (data.certHeatDemandKw || '')}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        updateField('certHeatDemandKw', val);
                      }}
                      className={`w-full pl-2 pr-8 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-bold font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                      placeholder="Pl. 8.4"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">kW</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fajlagos veszteség tényező (q)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="2.0"
                      value={data.certSpecificLossQ || ''}
                      disabled={data.certHeatDemandKw > 0}
                      onChange={(e) => updateField('certSpecificLossQ', Number(e.target.value))}
                      className={`w-full pl-2 pr-12 py-1.5 border rounded-lg text-xs focus:outline-none focus:border-blue-500 transition-all font-bold font-mono disabled:opacity-50 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                      placeholder="Pl. 0.38"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold font-mono">W/m³K</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">U_közép jellemző tényező (csak ha a fenti kW = 0).</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* 3. Hőigény összesítő & Mérnöki javaslat */}
      <div className={`rounded-lg border p-3 transition-all ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="border-b pb-1.5">
          <h3 className={`font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Hőigény összesítő &amp; Mérnöki javaslat
          </h3>
        </div>
        <div className="mt-3">

        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Helyszín: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{data.location}</strong> ({data.designTemp} °C)
          </span>
        </div>

        {/* 3-method comparison grid */}
        <div className="grid grid-cols-3 gap-2">
          {(() => {
            const methods = [
              { key: 'gas' as const, label: 'Gázfogyasztás', kw: gasKw, note: `${data.gasAnnualM3 || 0} m³/év` },
              { key: 'fabric' as const, label: 'Szerkezeti U', kw: fabricKw, note: `${data.heatedArea} m² alapján` },
              { key: 'certificate' as const, label: 'Tanúsítvány', kw: certKw, note: data.certHeatDemandKw > 0 ? 'Beírt érték' : `q=${data.certSpecificLossQ.toFixed(2)}` },
            ];
            return methods.map((m) => {
              const active = data.method === m.key;
              return (
                <div
                  key={m.key}
                  onClick={() => onChange({ ...data, method: m.key })}
                  className={`rounded-lg border cursor-pointer select-none transition-all duration-300 ${
                    active
                      ? isDark
                        ? 'bg-slate-800/50 border-slate-700 shadow-sm'
                        : 'bg-slate-100 border-slate-300 shadow-sm'
                      : isDark
                        ? 'bg-slate-900/30 border-slate-800 opacity-50 hover:opacity-80'
                        : 'bg-white border-slate-200 opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="flex flex-row items-center justify-between p-3 gap-2 w-full">
                    <div className="flex flex-col min-w-0">
                      <span className={`font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{m.label}</span>
                      <span className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{m.note}</span>
                    </div>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className={`font-light text-2xl md:text-3xl tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{m.kw.toFixed(1)}</span>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>kW</span>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
      </div>
    </div>
  );
};
