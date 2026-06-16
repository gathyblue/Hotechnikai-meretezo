import fs from 'fs';

let content = fs.readFileSync('src/components/ReportExport.tsx', 'utf8');

// Fix `.lead-box` style
content = content.replace(
  /\.lead-box\s*\{\s*border:\s*1px\s*solid\s*#1e293b;\s*background-color:\s*#0f172a;\s*color:\s*#ffffff;/g,
  '.lead-box {\n      border: 1px solid #e2e8f0;\n      background-color: #f8fafc;\n      color: #0f172a;'
);

// Fix `.hud-value` style
content = content.replace(
  /\.hud-value\s*\{\s*font-size:\s*14px;\s*font-weight:\s*bold;\s*color:\s*#ffffff;/g,
  '.hud-value {\n      font-size: 14px;\n      font-weight: bold;\n      color: #0f172a;'
);

// Fix `.hud-title` text color
content = content.replace(
  /color:\s*#94a3b8;/g,
  'color: #64748b;'
);

// Fix `.highlight-hp-table` style
content = content.replace(
  /\.highlight-hp-table\s*\{\s*background-color:\s*#0f172a;\s*color:\s*#ffffff;/g,
  '.highlight-hp-table {\n      background-color: #f8fafc;\n      color: #0f172a;\n      border: 1px solid #e2e8f0;'
);

// Update hpInfoHtml to use dark text
content = content.replace(/>Ajánlott r290 Hőszivattyú:/, '>Ajánlott r290 Hőszivattyú:');
content = content.replace(/color:\s*#ffffff;/g, 'color: #0f172a;');
content = content.replace(/color:\s*#94a3b8;/g, 'color: #64748b;');
// wait, the previous replace was global. let's just write specific replaces.

// Let's replace the whole hpInfoHtml string definition for safety:

const newHpInfoHtml = `const hpInfoHtml = selectedModel
      ? \`
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Ajánlott r290 Hőszivattyú:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #2563eb;">\${selectedModel.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Hűtőközeg Típus:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #16a34a;">R290 (Környezetbarát propán GWP=3)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Névleges Leadott Teljesítmény (A7/W35):</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; color: #0f172a;">\${selectedModel.capacityA7W35} kW (COP: \${selectedModel.copA7W35})</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Kalkulált fagyos teljesítmény (\${buildingData.designTemp}°C):</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; color: #0f172a;">\${selectedEmitter === 'radiator' ? selectedModel.capacityAm15W55 : selectedModel.capacityAm15W35} kW</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Szezonális SCOP fűtési tényező:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #16a34a;">\${selectedEmitter === 'radiator' ? selectedModel.scopW55 : selectedModel.scopW35}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Névleges feszültség fázis:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">\${selectedModel.voltage} (\${selectedModel.phases} fázis)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Hangnyomásszint (Lw):</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">\${selectedModel.soundDba} dB(A)</td>
      </tr>
      \`
      : '<tr><td colspan="2" style="padding: 15px; text-align: center; color: #64748b;">Csatolt hőszivattyús berendezés nem található a jegyzőkönyvben.</td></tr>';`;

content = content.replace(/const hpInfoHtml = selectedModel[\s\S]*?;\s*return/g, newHpInfoHtml + '\n\n    return');

// Add the discount prices into calculations
content = content.replace(/const baseDevicePrice = selectedModel \? selectedModel\.estimatedPriceHuf : 1800000;/g, `const discountPct = buildingData.productDiscountPct ?? 0;
    const baseDevicePrice = selectedModel ? selectedModel.estimatedPriceHuf : 1800000;
    const discountedDevicePrice = baseDevicePrice * (1 - discountPct / 100);`);

content = content.replace(/const totalInvestment = baseDevicePrice \+ installationSurcharge \+ dhwSurcharge;/g, `const totalInvestment = discountedDevicePrice + installationSurcharge + dhwSurcharge;`);

content = content.replace(/<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Hőszivattyú berendezés becsült listaára:<\/td>\s*<td.*?<\/td>\s*<\/tr>/g, `<tr>
          <td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; font-weight: bold;">Hőszivattyú berendezés becsült listaára:</td>
          <td style="padding: 4px 8px; font-size: 9.5px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: bold;">\${new Intl.NumberFormat('hu-HU').format(baseDevicePrice)} Ft</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">Hőszivattyú berendezés partneri kedvezményes ára (-\${discountPct}%):</td>
          <td style="padding: 4px 8px; font-size: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #2563eb;">\${new Intl.NumberFormat('hu-HU').format(discountedDevicePrice)} Ft</td>
        </tr>`);

// Append the SVG image at the bottom by injecting it
content = content.replace(/<div class="sign-box">\s*Megrendelő \/ Tulajdonos\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/, `<div class="sign-box">
        Megrendelő / Tulajdonos
      </div>
    </div>
    
    <div style="page-break-before: always; margin-top: 40px;">
      <h2>5. Gépészeti Hidraulikai Rendszerséma</h2>
      <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        \${document.querySelector('#system-diagram svg')?.outerHTML.replace('stroke="#e2e8f0"', 'stroke="#e2e8f0"').replace('isDark ? "#1e293b" : "#e2e8f0"', '"#e2e8f0"') || '<p>Séma nem áll rendelkezésre.</p>'}
      </div>
    </div>

  </div>
</body>`);


fs.writeFileSync('src/components/ReportExport.tsx', content);
