import fs from 'fs';

let content = fs.readFileSync('src/components/ReportExport.tsx', 'utf8');

// Update diagram selector
content = content.replace(/\#system-diagram svg/, '#print-diagram-container svg');

// Inject SystemDiagram import
if (!content.includes("import { SystemDiagram }")) {
  content = content.replace(/import \{.*?\} from '\.\.\/types';/, "$&\nimport { SystemDiagram } from './SystemDiagram';");
}

// Inject hidden diagram container before final closure
const container = `
        {/* Hidden SystemDiagram for safe light-mode printing */}
        <div id="print-diagram-container" className="hidden">
          <SystemDiagram 
            selectedModel={selectedModel} 
            hydraulicResults={hydraulicResults} 
            emitterType={selectedEmitter} 
            hydraulicState={hydraulicState} 
            theme="light" 
          />
        </div>
      </div>
    </div>
  );
};`;

content = content.replace(/      <\/div>\s*<\/div>\s*\);\s*\};\s*$/ms, container);

fs.writeFileSync('src/components/ReportExport.tsx', content);
