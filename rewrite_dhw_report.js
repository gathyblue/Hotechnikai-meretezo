import fs from 'fs';

let content = fs.readFileSync('src/components/ReportExport.tsx', 'utf8');

// Replace Mech installation in ReportExport
const oldMechInstallRegex = /<tr>\s*<td colSpan=\{2\} style="padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background-color: #f8fafc;">B\. Gépészeti szerelés és telepítés \(Bruttó\)<\/td>\s*<\/tr>\s*<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px solid #e2e8f0; color: #475569;">Gépészeti szerelés és telepítés csomag \(\$\{installationSurcharge === 2000000 \? '5m hosszig, 10kW-ig' : installationSurcharge === 3000000 \? '15m hosszig, 12kW-tól' : '15m \/ 10kW-ig vagy 5m \/ 12kW-tól'\}\)<\/td>\s*<td style="padding: 4px 8px; font-size: 9\.5px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #475569;">\$\{new Intl\.NumberFormat\('hu-HU'\)\.format\(installationSurcharge\)\} Ft<\/td>\s*<\/tr>/;

const newMechInstall = `<tr>
          <td colSpan={2} style="padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; background-color: #f8fafc;">B. Gépészeti szerelés és telepítés teljes csomag ára (Bruttó)</td>
        </tr>
        <tr>
          <td colSpan={2} style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; color: #475569; font-style: italic;">
            Tartalmazza: \${(selectedModel?.capacityA7W35 || 9) > 10 ? '100L' : '60L'} Inox puffertartály szigetelve, komplett zárt tágulási rendszerek fűtéskörhöz tartókkal, mágneses iszapleválasztók, prémium rézcsövezés (szivattyú-puffer-hálózat szakaszokon), mérnöki beüzemelési munkadíj.
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 20px; font-size: 9.5px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Gépészeti csomag egyösszegben:</td>
          <td style="padding: 4px 8px; font-size: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: #0f172a;">\${new Intl.NumberFormat('hu-HU').format(installationSurcharge)} Ft</td>
        </tr>`;

content = content.replace(oldMechInstallRegex, newMechInstall);

// Replace DHW unit prices in ReportExport
const oldDhwPackageRegex = /\$\{buildingData\.includeDhwPackage !== false \? `\s*<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; color: #475569;">\$\{dhwVolume\}L HMV Indirekt Tároló \(Hőszivattyús regiszteres\)<\/td>\s*<td style="padding: 4px 8px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; color: #475569;">\$\{new Intl\.NumberFormat\('hu-HU'\)\.format\(dhwTankHuf\)\} Ft<\/td>\s*<\/tr>\s*<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; color: #475569;">Motoros váltószelep \(3-járatú\)<\/td>\s*<td style="padding: 4px 8px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; color: #475569;">\$\{new Intl\.NumberFormat\('hu-HU'\)\.format\(dhwValveHuf\)\} Ft<\/td>\s*<\/tr>\s*<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; color: #475569;">HMV extra csövezés és elzárók<\/td>\s*<td style="padding: 4px 8px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; color: #475569;">\$\{new Intl\.NumberFormat\('hu-HU'\)\.format\(dhwPipingHuf\)\} Ft<\/td>\s*<\/tr>\s*<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; color: #475569;">Elektromos fűtőpatron \(Biztonsági tartalék\)<\/td>\s*<td style="padding: 4px 8px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; color: #475569;">\$\{new Intl\.NumberFormat\('hu-HU'\)\.format\(dhwHeaterHuf\)\} Ft<\/td>\s*<\/tr>\s*<tr>\s*<td style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px solid #e2e8f0; color: #475569;">HMV Munkadíj<\/td>\s*<td style="padding: 4px 8px; font-size: 9px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'JetBrains Mono', monospace; color: #475569;">\$\{new Intl\.NumberFormat\('hu-HU'\)\.format\(dhwLaborHuf\)\} Ft<\/td>\s*<\/tr>\s*` : `/;

const newDhwPackage = `\${buildingData.includeDhwPackage !== false ? \`
        <tr>
          <td colSpan={2} style="padding: 4px 8px 4px 20px; font-size: 9px; border-bottom: 1px dashed #e2e8f0; color: #475569; font-style: italic;">
            Tartalmazza: \${dhwVolume}L Indirekt hőszivattyús HMV tároló dupla csőkígyóval, motoros 3-járatú váltószelep, HMV csövezés és elzárók, kiegészítő fúvóka patron biztosítás, komplett gépészeti munkadíj.
          </td>
        </tr>
        \` : \``;

content = content.replace(oldDhwPackageRegex, newDhwPackage);

fs.writeFileSync('src/components/ReportExport.tsx', content);
