const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace 'FWL CRM' (case insensitive) -> FWL CRM
  content = content.replace(/Lead\s+pulse/gi, 'FWL CRM');
  
  // Replace 'FWL CRM' or 'FWL CRM' -> FWL CRM
  content = content.replace(/FWL CRM/g, 'FWL CRM');
  content = content.replace(/FWL CRM/g, 'FWL CRM');
  
  // Replace 'fwl-crm' -> fwl-crm
  content = content.replace(/fwl-crm/g, 'fwl-crm');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.vercel' || file.startsWith('.')) continue;
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css') || p.endsWith('.json')) {
      replaceInFile(p);
    }
  }
}

walk(process.cwd());
