const fs = require('fs');
const path = require('path');

// IBT file format: binary header followed by YAML session info
// Header structure (little-endian):
// 0x00: int32 - version
// 0x04: int32 - status
// 0x08: int32 - tick rate
// 0x0C: int32 - session info update
// 0x10: int32 - session info length
// 0x14: int32 - session info offset
// 0x18: int32 - num vars
// 0x1C: int32 - var header offset
// ... more header data
// Session info is YAML text at sessionInfoOffset

function parseIbtFile(filePath) {
  const buffer = fs.readFileSync(filePath);

  // Read header
  const version = buffer.readInt32LE(0);
  const status = buffer.readInt32LE(4);
  const tickRate = buffer.readInt32LE(8);
  const sessionInfoUpdate = buffer.readInt32LE(12);
  const sessionInfoLen = buffer.readInt32LE(16);
  const sessionInfoOffset = buffer.readInt32LE(20);

  // Extract session info YAML
  const sessionInfoRaw = buffer.slice(sessionInfoOffset, sessionInfoOffset + sessionInfoLen);
  const sessionInfoYaml = sessionInfoRaw.toString('utf8').replace(/\0/g, '');

  return {
    version,
    tickRate,
    sessionInfoYaml
  };
}

// Parse YAML manually (simple approach for iRacing format)
function parseSimpleYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split('\n');
  const stack = [{ indent: -1, obj: result }];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const match = line.match(/^(\s*)(.+?):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2];
    const value = match[3];

    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === '' || value === '---') {
      // New object
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
    } else {
      // Value
      parent[key] = value;
    }
  }

  return result;
}

// Extract lap times from session info
function extractLapInfo(sessionYaml) {
  // Find ResultsPositions sections which contain lap times
  const lapMatches = sessionYaml.matchAll(/LapsComplete:\s*(\d+)/g);
  const bestLapMatches = sessionYaml.matchAll(/FastestLap:\s*(\d+)/g);
  const bestTimeMatches = sessionYaml.matchAll(/FastestTime:\s*([\d.]+)/g);
  const lastTimeMatches = sessionYaml.matchAll(/LastTime:\s*([\d.]+)/g);

  return {
    lapsComplete: [...lapMatches].map(m => parseInt(m[1])),
    fastestLaps: [...bestLapMatches].map(m => parseInt(m[1])),
    fastestTimes: [...bestTimeMatches].map(m => parseFloat(m[1])),
    lastTimes: [...lastTimeMatches].map(m => parseFloat(m[1]))
  };
}

// Format time in mm:ss.xxx
function formatLapTime(seconds) {
  if (seconds <= 0 || seconds > 600) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

// Test with a larger file (more laps)
const testFile = path.join(__dirname, '../monza/superformulalights324_monza full 2026-01-11 18-30-01.ibt');
console.log('Parsing:', path.basename(testFile));
console.log('');

const { version, tickRate, sessionInfoYaml } = parseIbtFile(testFile);
console.log('IBT Version:', version);
console.log('Tick Rate:', tickRate, 'Hz');
console.log('');

// Extract key info using regex
const trackMatch = sessionInfoYaml.match(/TrackDisplayName:\s*(.+)/);
const trackShortMatch = sessionInfoYaml.match(/TrackDisplayShortName:\s*(.+)/);
const carMatch = sessionInfoYaml.match(/CarScreenName:\s*(.+)/);
const driverMatch = sessionInfoYaml.match(/UserName:\s*(.+)/);

console.log('--- Session Info ---');
console.log('Track:', trackMatch ? trackMatch[1] : 'Unknown');
console.log('Track Short:', trackShortMatch ? trackShortMatch[1] : 'Unknown');
console.log('Car:', carMatch ? carMatch[1] : 'Unknown');
console.log('Driver:', driverMatch ? driverMatch[1] : 'Unknown');
console.log('');

// Get lap data
const lapInfo = extractLapInfo(sessionInfoYaml);
console.log('--- Lap Data ---');
console.log('Laps Complete:', lapInfo.lapsComplete);
console.log('Fastest Times:', lapInfo.fastestTimes.map(formatLapTime));
console.log('Last Times:', lapInfo.lastTimes.map(formatLapTime));

// Find best lap time
const validTimes = lapInfo.fastestTimes.filter(t => t > 0 && t < 600);
if (validTimes.length > 0) {
  const bestTime = Math.min(...validTimes);
  console.log('\n*** Best Lap Time:', formatLapTime(bestTime), '***');
}

// Save raw YAML for inspection
fs.writeFileSync(path.join(__dirname, 'session-info-sample.yaml'), sessionInfoYaml);
console.log('\nFull session YAML saved to scripts/session-info-sample.yaml');
