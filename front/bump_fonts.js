const fs = require('fs');
const path = require('path');

const srcDir = 'e:/Programacion-E/AppPaciente/front/src';

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') {
        if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
          filelist.push(dirFile);
        }
      } else {
        throw err;
      }
    }
  });
  return filelist;
};

// Fix the walk directory:
function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* Recurse into a subdirectory */
            results = results.concat(getFiles(file));
        } else { 
            /* Is a file */
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const allFiles = getFiles(srcDir);
let changedFiles = 0;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find fontSize: <number> and add 2 to it
  const newContent = content.replace(/fontSize:\s*(\d+)/g, (match, size) => {
    const newSize = parseInt(size, 10) + 2;
    return `fontSize: ${newSize}`;
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
    console.log(`Updated: ${file}`);
  }
}

console.log(`\nSuccessfully bumped fontSize in ${changedFiles} files.`);
