import fs from 'fs';

let content = fs.readFileSync('src/components/ReportExport.tsx', 'utf8');

const injection = `      <div style="page-break-before: always; margin-top: 40px;">
        <h2>5. Gépészeti Hidraulikai Rendszerséma</h2>
        <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px;">
          \${document.querySelector('#system-diagram svg')?.outerHTML || '<p>Séma nem áll rendelkezésre.</p>'}
        </div>
      </div>
    </div>
  </body>`;

content = content.replace(/<\/div>\s*<\/body>/, injection);

fs.writeFileSync('src/components/ReportExport.tsx', content);
