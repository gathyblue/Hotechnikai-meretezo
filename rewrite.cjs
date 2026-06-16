const fs = require('fs');

const svgCode = `          <svg
            viewBox="0 0 1000 480"
            className="w-full h-auto max-w-[1000px] bg-transparent"
            style={{ minHeight: '385px' }}
          >
            {/* GRID BACKGROUND FOR EXPERT LOOK */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" stroke={isDark ? "#1e293b" : "#e2e8f0"} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1000" height="480" fill="url(#grid)" />

            {/* BASE ELEMENTS DEFINITIONS */}
            <defs>
              {/* Pump Icon */}
              <g id="dab-pump">
                <circle cx="0" cy="0" r="16" fill="#047857" stroke="#34d399" strokeWidth="1.5" />
                <polygon points="-5,-5 7,0 -5,5" fill="#ffffff" />
              </g>
              {/* Expansion Vessel Red */}
              <g id="expansion-vessel">
                <rect x="-15" y="-20" width="30" height="40" rx="15" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="0" y1="-20" x2="0" y2="-30" stroke="#3b82f6" strokeWidth="2" />
              </g>
              {/* Heat Exchanger symbol */}
              <g id="heat-exchanger">
                <rect x="-25" y="-60" width="50" height="120" rx="4" fill={isDark ? "#1e293b" : "#e2e8f0"} stroke="#f97316" strokeWidth="2" />
                <line x1="-15" y1="-50" x2="-15" y2="50" stroke={isDark ? "#f43f5e" : "#e11d48"} strokeWidth="1" strokeDasharray="3,2" />
                <line x1="-5" y1="-50" x2="-5" y2="50" stroke={isDark ? "#3b82f6" : "#2563eb"} strokeWidth="1" strokeDasharray="3,2" />
                <line x1="5" y1="-50" x2="5" y2="50" stroke={isDark ? "#10b981" : "#059669"} strokeWidth="1" strokeDasharray="3,2" />
                <line x1="15" y1="-50" x2="15" y2="50" stroke={isDark ? "#3b82f6" : "#2563eb"} strokeWidth="1" strokeDasharray="3,2" />
              </g>
              {/* 3 Way Valve */}
              <g id="three-way-valve">
                <polygon points="-8,-8 8,0 -8,8" fill="#eab308" />
                <polygon points="-8,-8 0,8 8,-8" fill="#eab308" transform="rotate(90)" />
                <circle cx="0" cy="0" r="4" fill="#ffffff" />
              </g>
              {/* Y filter */}
              <g id="y-filter">
                <rect x="-8" y="-12" width="16" height="24" rx="2" fill={isDark ? "#64748b" : "#94a3b8"} stroke="#cbd5e1" strokeWidth="1" />
                <circle cx="0" cy="0" r="4" fill="#ef4444" />
              </g>
            </defs>

            {/* ======================= PIPELINES ======================= */}
            {/* Primary Circuit */}
            <path d="M 120,220 H 450" fill="none" stroke="#ef4444" strokeWidth="3" />
            <path d="M 120,340 H 450" fill="none" stroke="#3b82f6" strokeWidth="3" />
            
            {/* Main Separation Block logic */}
            {hydraulicState.includeHeatExchanger ? (
              <>
                {/* Heat Exchanger Placement */}
                <use href="#heat-exchanger" x="475" y="280" />
                <text x="475" y="200" fill="#f97316" fontSize="9" fontWeight="bold" textAnchor="middle">KÖZEG LEVÁLASZTÓ (HX)</text>
                
                {/* Series Buffer Placement on Return */}
                <rect x="350" y="300" width="60" height="80" rx="4" fill={isDark ? "#0f172a" : "#f1f5f9"} stroke="#f43f5e" strokeWidth="2" />
                <text x="380" y="340" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">SOROS PUFFER</text>
                
                {/* Pipe connections to HX and Buffer */}
                <path d="M 450,220 H 450" fill="none" stroke="#ef4444" strokeWidth="3" /> {/* Enter HX top-left */}
                <path d="M 450,340 H 410" fill="none" stroke="#3b82f6" strokeWidth="3" /> {/* Exit buffer right / Enter HX bottom-left */}
                <path d="M 350,340 H 320" fill="none" stroke="#3b82f6" strokeWidth="3" /> {/* Exit buffer left to main return */}

                {/* Secondary pipes */}
                <path d="M 500,220 H 700" fill="none" stroke="#10b981" strokeWidth="3" /> {/* Flow out HX */}
                <path d="M 500,340 H 700" fill="none" stroke="#10b981" strokeWidth="3" /> {/* Return into HX */}
                
                <use href="#dab-pump" x="550" y="220" />
                <text x="550" y="240" fill={isDark ? "#34d399" : "#059669"} fontSize="8" fontWeight="bold" textAnchor="middle">Szekunder Köri Szivattyú</text>
              </>
            ) : (
              <>
                {/* 4-Port Buffer Hidrováltó */}
                <rect x="450" y="200" width="70" height="160" rx="6" fill={isDark ? "#0f172a" : "#f1f5f9"} stroke="#3b82f6" strokeWidth="2" />
                <text x="485" y="280" fill={isDark ? "#64748b" : "#475569"} fontSize="9" fontWeight="bold" textAnchor="middle">PUFFER HIDROVÁLTÓ</text>
                
                {/* Connections already hit X=450 */}
                {/* Secondary pipes from 520 */}
                <path d="M 520,220 H 700" fill="none" stroke="#10b981" strokeWidth="3" />
                <path d="M 520,340 H 700" fill="none" stroke="#10b981" strokeWidth="3" />
                
                <use href="#dab-pump" x="570" y="220" />
                <text x="570" y="240" fill={isDark ? "#34d399" : "#059669"} fontSize="8" fontWeight="bold" textAnchor="middle">Szekunder Szivattyú</text>
              </>
            )}

            {/* Expansion Vessels */}
            {hydraulicState.includeHeatExchanger ? (
              <>
                <use href="#expansion-vessel" x="300" y="390" />
                <use href="#expansion-vessel" x="600" y="390" />
                <path d="M 300,340 V 360" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <path d="M 600,340 V 360" fill="none" stroke="#10b981" strokeWidth="2" />
                <text x="300" y="415" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="7" fontWeight="bold" textAnchor="middle">Primer tág.</text>
                <text x="600" y="415" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="7" fontWeight="bold" textAnchor="middle">Szekunder tág.</text>
              </>
            ) : (
              <>
                <use href="#expansion-vessel" x="350" y="390" />
                <path d="M 350,340 V 360" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <text x="350" y="415" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="7" fontWeight="bold" textAnchor="middle">Fűtési tág. ({hydraulicResults.vesselSizeL}L)</text>
              </>
            )}

            {/* DHW BRANCH */}
            {hydraulicState.includeDhwTank ? (
              <>
                {/* Diverter Valve */}
                <use href="#three-way-valve" x="220" y="220" />
                <text x="220" y="200" fill="#eab308" fontSize="8" fontWeight="bold" textAnchor="middle">Váltószelep</text>
                
                {/* DHW Flow Pipe */}
                <path d="M 220,220 V 100 H 280" fill="none" stroke="#ef4444" strokeWidth="3" />
                
                {/* DHW Tank Representation */}
                <rect x="280" y="40" width="100" height="120" rx="8" fill={isDark ? "#1e1b4b" : "#fdf4ff"} stroke="#d946ef" strokeWidth="2" />
                <text x="330" y="55" fill={isDark ? "#f0abfc" : "#c026d3"} fontSize="9" fontWeight="bold" textAnchor="middle">INDIREKT HMV TÁROLÓ</text>
                
                {/* Internal Coil */}
                <path d="M 280,100 C 310,100 370,110 330,120 C 290,130 370,140 330,150 L 280,150" fill="none" stroke="#ef4444" strokeWidth="3" />
                
                {/* DHW Return Pipe */}
                <path d="M 280,150 H 200 V 340" fill="none" stroke="#3b82f6" strokeWidth="3" />
                <circle cx="200" cy="340" r="4" fill="#3b82f6" stroke="#ffffff" />
                
                {/* Sanitary Output line */}
                <path d="M 380,80 H 420 v 20" fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="4,2" />
                <text x="420" y="115" fill="#ec4899" fontSize="8" fontWeight="bold" textAnchor="middle">SZANITER MELEGVÍZ (HMV)</text>
                {/* Shower/Tap icon simple */}
                <path d="M 410,120 H 430 A 5,5 0 0 1 425,130 H 415 A 5,5 0 0 1 410,120" fill="#f472b6" />
                <path d="M 417,135 v 5  M 423,135 v 5" stroke="#38bdf8" strokeWidth="1.5" />
              </>
            ) : null}

            {/* MAGIC FILTER */}
            <use href="#y-filter" x="180" y="340" transform="rotate(-90 180 340)" />
            <text x="180" y="360" fill={isDark ? "#94a3b8" : "#475569"} fontSize="8" fontStyle="italic" textAnchor="middle">Iszaplevál.</text>

            {/* ======================= EQUIPMENT UNITS ======================= */}
            
            {/* HEAT PUMP */}
            <g transform="translate(20, 190)">
              <rect x="0" y="0" width="100" height="180" rx="6" fill={isDark ? "#1e293b" : "#ffffff"} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="2" />
              <rect x="10" y="20" width="80" height="60" rx="34" fill={isDark ? "#0f172a" : "#f1f5f9"} stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" />
              <circle cx="50" cy="50" r="25" fill="none" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="2" />
              {/* Fan Blades */}
              <line x1="50" y1="25" x2="50" y2="75" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="4" />
              <line x1="25" y1="50" x2="75" y2="50" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="4" />
              
              <text x="50" y="110" fill={isDark ? "#38bdf8" : "#0284c7"} fontSize="12" fontWeight="900" textAnchor="middle">HŐSZIVATTYÚ</text>
              <text x="50" y="130" fill={isDark ? "#94a3b8" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">Monoblokk</text>
              <text x="50" y="150" fill={isDark ? "#10b981" : "#059669"} fontSize="9" fontWeight="900" textAnchor="middle">{selectedModel ? selectedModel.capacityA7W35 + ' kW' : '9.0 kW'}</text>
            </g>

            {/* EMITTERS */}
            <g transform="translate(700, 160)">
              {emitterType === 'floor' || emitterType === 'cool18' || emitterType === 'cool12' ? (
                <>
                  {/* Manifolds */}
                  <rect x="0" y="30" width="20" height="60" rx="2" fill="#ef4444" />
                  <rect x="0" y="150" width="20" height="60" rx="2" fill="#3b82f6" />
                  <text x="-15" y="62" fill="#ef4444" fontSize="10" fontWeight="bold">&gt;</text>
                  <text x="-15" y="182" fill="#3b82f6" fontSize="10" fontWeight="bold">&lt;</text>
                  
                  {/* Floor heating loops representation */}
                  <path d="M 20,60 H 130 A 10,10 0 0 1 140,70 V 170 A 10,10 0 0 1 130,180 H 20" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 20,70 H 110 A 10,10 0 0 1 120,80 V 160 A 10,10 0 0 1 110,170 H 20" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 20,80 H 90 A 10,10 0 0 1 100,90 V 150 A 10,10 0 0 1 90,160 H 20" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                  
                  <rect x="40" y="100" width="120" height="40" rx="4" fill={isDark ? "#1e293b" : "#ffffff"} stroke={isDark ? "#475569" : "#cbd5e1"} />
                  <text x="100" y="115" fill={isDark ? "#f59e0b" : "#d97706"} fontSize="9" fontWeight="bold" textAnchor="middle">PADLÓFŰTÉSI KÖRÖK</text>
                  <text x="100" y="130" fill={isDark ? "#94a3b8" : "#64748b"} fontSize="8" textAnchor="middle">Osztó-gyűjtő csatlakozás ({Math.round(hydraulicResults.secondaryFlowRateLh)} L/h)</text>
                </>
              ) : (
                <>
                  <path d="M 0,60 H 50" fill="none" stroke="#ef4444" strokeWidth="3" />
                  <path d="M 0,180 H 50" fill="none" stroke="#3b82f6" strokeWidth="3" />
                  
                  {/* Big Radiator */}
                  <g transform="translate(50, 40)">
                    <rect x="0" y="0" width="100" height="160" rx="4" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke={isDark ? "#64748b" : "#94a3b8"} strokeWidth="2" />
                    {Array.from({length: 7}).map((_, i) => (
                      <line key={i} x1={15 + i*11.6} y1="20" x2={15 + i*11.6} y2="140" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="6" strokeLinecap="round" />
                    ))}
                    <text x="50" y="-10" fill={isDark ? "#f43f5e" : "#e11d48"} fontSize="10" fontWeight="bold" textAnchor="middle">RADIÁTOROS KÖRÖK (+55°C)</text>
                  </g>
                </>
              )}
            </g>
          </svg>
`;

let content = fs.readFileSync('src/components/SystemDiagram.tsx', 'utf8');
const startTag = '<svg';
const endTag = '</svg>';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag) + endTag.length;

const newContent = content.substring(0, startIndex) + svgCode.trim() + '\n          ' + content.substring(endIndex);
fs.writeFileSync('src/components/SystemDiagram.tsx', newContent);
