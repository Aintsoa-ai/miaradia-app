const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('./app').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Alert.alert(')) {
    // Replace Alert.alert
    content = content.replace(/Alert\.alert\(/g, 'CustomAlert.alert(');
    
    // Check if CustomAlert is imported
    if (!content.includes('import { CustomAlert } from')) {
      let relativePath = path.relative(path.dirname(file), './utils/alert').replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      const importStr = `\nimport { CustomAlert } from '${relativePath}';\n`;
      content = content.replace(/^(.*)/, `$1${importStr}`);
    }
    fs.writeFileSync(file, content);
    changed++;
  }
});
console.log('Modified files:', changed);
