import fs from 'fs';
import path from 'path';

const files = [
  'src/components/TaskSlider.tsx',
  'src/pages/BlockedTasksPage.tsx',
  'src/pages/DeletedTasksPage.tsx',
  'src/pages/ProjectDetailPage.tsx',
  'src/pages/TasksPage.tsx',
  'src/pages/UsersPage.tsx'
];

for (const file of files) {
  const p = path.resolve(process.cwd(), file);
  let content = fs.readFileSync(p, 'utf8');
  
  // Remove await Promise.resolve();
  content = content.replace(/[ \t]*await Promise\.resolve\(\);\r?\n/g, '');
  
  // Replace setTimeout pattern in useEffect
  content = content.replace(
    /const timer = setTimeout\(\(\) => \{\r?\n\s*([a-zA-Z0-9_]+)\(\);\r?\n\s*\}, 0\);\r?\n\s*return \(\) => clearTimeout\(timer\);/g,
    '$1();'
  );
  
  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed', file);
}
