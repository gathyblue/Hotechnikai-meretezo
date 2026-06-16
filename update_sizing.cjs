const fs = require('fs');

let code = fs.readFileSync('src/components/SizingResults.tsx', 'utf8');

// Replace DHW array pricing strings
code = code.replace(/<span className="block">• \{dhwVolume\}L indirekt hőszivattyús HMVT-tároló fűtőpatronnal \(\{formatHu\(dhwTankHuf\)\} Ft\)<\/span>/, '<span className="block">• {dhwVolume}L indirekt hőszivattyús HMVT-tároló fűtőpatronnal</span>');
code = code.replace(/<span className="block">• 3-járatú motoros fűtés-HMV váltószelep \(\{formatHu\(dhwValveHuf\)\} Ft\)<\/span>/, '<span className="block">• 3-járatú motoros fűtés-HMV váltószelep</span>');
code = code.replace(/<span className="block">• HMV csövezési kiegészítők, elzárók \(\{formatHu\(dhwPipingHuf\)\} Ft\)<\/span>/, '<span className="block">• HMV csövezési kiegészítők, elzárók</span>');
code = code.replace(/<span className="block">• Extra elektromos fűtőpatron betápláló áramkör \(\{formatHu\(dhwHeaterHuf\)\} Ft\)<\/span>/, '<span className="block">• Extra elektromos fűtőpatron betápláló áramkör</span>');
code = code.replace(/<span className="block">• Gépészeti és elektromos szerelési munkadíj \(\{formatHu\(dhwLaborHuf\)\} Ft\)<\/span>/, '<span className="block">• Gépészeti és elektromos szerelési munkadíj</span>');

// Replace the generic compact package block with a detailed one

const newMechBlock = `              <div className={\`p-2.5 rounded border flex flex-col justify-between \${isDark ? 'border-amber-800/40 bg-amber-900/10' : 'border-amber-200 bg-amber-50/50'}\`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-amber-500 text-[8px] font-black uppercase tracking-wider">GÉPÉSZETI SZERELÉS ÉS TELEPÍTÉS</span>
                    <span className={\`text-[11px] font-mono font-black \${isDark ? 'text-amber-400' : 'text-amber-700'}\`}>{formatHu(installationSurcharge)} Ft</span>
                  </div>
                  <div className="text-[7.5px] leading-[1.15] bg-amber-500/5 p-1.5 rounded border border-amber-500/10 space-y-1 text-slate-400">
                    <span className="block font-bold text-amber-500 uppercase">A hőszivattyú telepítési csomag részei:</span>
                    <span className="block">• {(selectedModel?.capacityA7W35 || 9) > 10 ? '100L' : '60L'} Inox puffertartály szigetelve</span>
                    <span className="block">• Komplett zárt tágulási rendszerek fűtéskörhöz tartókkal</span>
                    <span className="block">• Iszapleválasztók szakszerű telepítése merítőszenzorokkal</span>
                    <span className="block">• Nyomásmérők, légtelenítők, biztonsági szelepek</span>
                    <span className="block">• Védőszigetelt prémium rézcsövezés (szivattyú-puffer-hálózat szakaszokon)</span>
                    <span className="block">• Mérnöki beüzemelési munkadíj és betanítás</span>
                  </div>
                </div>
              </div>`;

code = code.replace(/<div className=\{\`p-2\.5 rounded border flex flex-col justify-between \$\{isDark \? 'border-slate-850 bg-slate-900\/50' : 'border-slate-200 bg-slate-50\/50'\}\`\}>\s*<div>\s*<span className="text-slate-400 text-\[8px\] font-black uppercase block tracking-wider mb-1">GÉPÉSZETI SZERELÉS ÉS TELEPÍTÉS CSOMAG<\/span>\s*<span className=\{\`text-\[11px\] font-mono font-black block mb-1\.5 \$\{isDark \? 'text-slate-200' : 'text-slate-800'\}\`\}>\{formatHu\(installationSurcharge\)\} Ft<\/span>\s*<p className="text-\[7\.5px\] text-slate-400 leading-normal mb-2\.5">\s*Tartalmazza: komplett zárt tágulási rendszerek fűtéskörhöz, nyomásmérők, légtelenítők, biztonsági szelepek, bypass ág bypass-szeleppel, védőszigetelt prémium rézcsövezés és iszapleválasztók szakszerű telepítése merítőszenzorokkal és mérnöki beüzemelési munkadíjjal együtt\.\s*<\/p>\s*<\/div>\s*<\/div>/g, newMechBlock);

// Discount selection input rewrite
const discountSelector = `<div className="flex gap-0.5">
                      {[0, 5, 10, 15, 20, 25].map(pct => (
                        <button
                          key={pct}
                          onClick={() => onChange({ ...buildingData, productDiscountPct: pct })}
                          className={\`px-1.5 py-0.5 text-[8px] font-bold rounded cursor-pointer transition-all \${
                            discountPct === pct 
                              ? 'bg-blue-600 text-white shadow' 
                              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }\`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>`;

code = code.replace(/<input\s*type="number"\s*min="0"\s*max="100"\s*value=\{discountPct \|\| ''\}\s*onChange=\{\(e\) => onChange\(\{ \.\.\.buildingData, productDiscountPct: Number\(e\.target\.value\) \}\)\}\s*placeholder="%"\s*className=\{\`w-12 px-1 text-right py-0\.5 text-\[9px\] font-mono rounded border \$\{isDark \? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800'\}\`\}\s*\/>/g, discountSelector);

fs.writeFileSync('src/components/SizingResults.tsx', code);
