import path from 'node:path';

// Cross-platform test environment setup
// On Windows, if TEMP points to a network/cloud mount (e.g. RaiDrive E:\), redirect to local storage
if (process.platform === 'win32') {
  const current = process.env.TEMP || process.env.TMP || '';
  if (current.startsWith('E:') || current.startsWith('\\\\')) {
    const localTemp = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Temp')
      : 'C:\\Users\\Akshan sharma\\AppData\\Local\\Temp';
    process.env.TEMP = localTemp;
    process.env.TMP = localTemp;
  }
}
