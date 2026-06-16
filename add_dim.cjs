const fs = require('fs');
let code = fs.readFileSync('src/heatPumpData.ts', 'utf8');

// Simple regex replace to add dimensions after weightKg
code = code.replace(/weightKg:\s*(\d+),/g, "weightKg: $1,\n    dimensions: '1118 × 865 × 526 mm',");

// Modify specific ones if needed, let's just add generic dimensions to all of them for now
code = code.replace(/'panasonic-l-\d+',[\s\S]*?dimensions:\s*'[^']+',/g, (match) => {
    return match.replace(/dimensions:\s*'[^']+',/, "dimensions: '980 × 1000 × 430 mm',");
});

code = code.replace(/'panasonic-\d+',[\s\S]*?dimensions:\s*'[^']+',/g, (match) => {
    return match.replace(/dimensions:\s*'[^']+',/, "dimensions: '1283 × 932 × 320 mm',");
});

fs.writeFileSync('src/heatPumpData.ts', code);
