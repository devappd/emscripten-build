import path from 'path';
import resolvePath from 'resolve-path';
import fs from 'fs';

// https://github.com/tapjs/libtap/pull/21/files
export function MainScript(defaultName) {
  if (typeof repl !== 'undefined' || '_eval' in process) {
    return defaultName
  }

  return process.argv[1] || defaultName
}

export function MainModuleDir() {
  let mainScript = MainScript('.');

  if (mainScript === '.')
    return path.resolve('.');
  else
    return path.resolve(path.dirname(mainScript));
}

// https://stackoverflow.com/a/53530146
export function IsDir(path) {
  try {
      var stat = fs.lstatSync(path);
      return stat.isDirectory();
  } catch (e) {
      // lstatSync throws an error if path doesn't exist
      return false;
  }
}

export function TryResolvePath(relativePath, rootPath) {
  if (!rootPath)
    return path.resolve(relativePath);

  try {
    return resolvePath(rootPath, relativePath);
  } catch (e) {
    // Malicious or invalid. Just pass the path as-is.
    return relativePath;
  }
}