import fs from 'fs';

const filePath = 'C:/Users/Akshan sharma/Desktop/SIS1.0/server/services/sisUnifiedSystem.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `              let cpuDetail = null;
              try {
                const { stdout: cpuOut } = await openclawController.executeShell(
                  'powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, CurrentClockSpeed, MaxClockSpeed | ConvertTo-Json"',
                );
                cpuDetail = JSON.parse(cpuOut);
              } catch (_) {}
              let osDetail = null;
              try {
                const { stdout: osOut } = await openclawController.executeShell(
                  'powershell -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory, TotalVirtualMemorySize, FreeVirtualMemory | ConvertTo-Json"',
                );
                osDetail = JSON.parse(osOut);
              } catch (_) {}`;

const replacementStr = `              let cpuDetail = null;
              let osDetail = null;
              if (process.platform === 'win32') {
                try {
                  const { stdout: cpuOut } = await openclawController.executeShell(
                    'powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, CurrentClockSpeed, MaxClockSpeed | ConvertTo-Json"',
                  );
                  cpuDetail = JSON.parse(cpuOut);
                } catch (_) {}
                try {
                  const { stdout: osOut } = await openclawController.executeShell(
                    'powershell -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory, TotalVirtualMemorySize, FreeVirtualMemory | ConvertTo-Json"',
                  );
                  osDetail = JSON.parse(osOut);
                } catch (_) {}
              }`;

// Normalize newlines for matching
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');
const normReplacement = replacementStr.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, normReplacement);
  // Restore original CRLF
  fs.writeFileSync(filePath, updated.replace(/\n/g, '\r\n'), 'utf8');
  console.log('SUCCESS: Patched sisUnifiedSystem.js for cross-platform platform guard');
} else {
  console.error('FAIL: Target string not found');
}
