import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/const mainEl = document\.querySelector\('main'\);\s*if \(mainEl\) \{\s*mainEl\.scrollTop = 0;\s*\}\s*window\.scrollTo\(0, 0\);/g, `window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTop = 0;`);

fs.writeFileSync('src/App.tsx', content);
