const fs = require('fs');
const path = require('path');

/**
 * Process all .ibt files and extract session/lap data
 * Outputs JSON for use in the web app
 */

function parseIbtHeader(buffer) {
  return {
    version: buffer.readInt32LE(0),
    tickRate: buffer.readInt32LE(8),
    sessionInfoLen: buffer.readInt32LE(16),
    sessionInfoOffset: buffer.readInt32LE(20),
    numVars: buffer.readInt32LE(24),
    varHeaderOffset: buffer.readInt32LE(28),
    bufLen: buffer.readInt32LE(36),
  };
}

function parseVarHeaders(buffer, numVars, offset) {
  const vars = [];
  const VAR_HEADER_SIZE = 144;

  for (let i = 0; i < numVars; i++) {
    const pos = offset + i * VAR_HEADER_SIZE;
    const type = buffer.readInt32LE(pos);
    const dataOffset = buffer.readInt32LE(pos + 4);

    let nameEnd = pos + 16;
    while (nameEnd < pos + 48 && buffer[nameEnd] !== 0) nameEnd++;
    const name = buffer.slice(pos + 16, nameEnd).toString('utf8');

    vars.push({ name, type, dataOffset });
  }

  return vars;
}

function readVar(buffer, varInfo, sampleOffset) {
  const pos = sampleOffset + varInfo.dataOffset;
  switch (varInfo.type) {
    case 2: return buffer.readInt32LE(pos);
    case 4: return buffer.readFloatLE(pos);
    case 5: return buffer.readDoubleLE(pos);
    default: return null;
  }
}

function extractSessionInfo(buffer, offset, len) {
  const yaml = buffer.slice(offset, offset + len).toString('utf8').replace(/\0/g, '');

  const trackMatch = yaml.match(/TrackDisplayName:\s*(.+)/);
  const trackShortMatch = yaml.match(/TrackDisplayShortName:\s*(.+)/);
  const carMatch = yaml.match(/CarScreenName:\s*(.+)/);
  const driverMatch = yaml.match(/UserName:\s*(.+)/);

  return {
    track: trackMatch ? trackMatch[1].trim() : 'Unknown',
    trackShort: trackShortMatch ? trackShortMatch[1].trim() : 'Unknown',
    car: carMatch ? carMatch[1].trim() : 'Unknown',
    driver: driverMatch ? driverMatch[1].trim() : 'Unknown',
  };
}

function parseDateFromFilename(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}-\d{2}-\d{2})\.ibt$/);
  if (match) {
    const [_, date, time] = match;
    const [hour, min, sec] = time.split('-');
    return {
      date,
      time: `${hour}:${min}:${sec}`,
      datetime: new Date(`${date}T${hour}:${min}:${sec}`)
    };
  }
  return null;
}

function formatLapTime(seconds) {
  if (!seconds || seconds <= 0 || seconds > 600) return null;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

function processIbtFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const dateInfo = parseDateFromFilename(fileName);

  const header = parseIbtHeader(buffer);
  const sessionInfo = extractSessionInfo(buffer, header.sessionInfoOffset, header.sessionInfoLen);
  const vars = parseVarHeaders(buffer, header.numVars, header.varHeaderOffset);

  // Find lap variables
  const lapVar = vars.find(v => v.name === 'Lap');
  const lastLapTimeVar = vars.find(v => v.name === 'LapLastLapTime');
  const bestLapTimeVar = vars.find(v => v.name === 'LapBestLapTime');

  if (!lapVar || !lastLapTimeVar) {
    return {
      fileName,
      date: dateInfo?.date,
      time: dateInfo?.time,
      ...sessionInfo,
      laps: [],
      bestLapTime: null,
      totalLaps: 0,
      error: 'Missing lap variables'
    };
  }

  // Get buffer offset
  const bufOffset = buffer.readInt32LE(52);
  const bufLen = header.bufLen;
  const totalSamples = Math.floor((buffer.length - bufOffset) / bufLen);

  // Extract lap times
  const laps = [];
  let prevLap = -1;
  let sessionBestTime = Infinity;

  for (let i = 0; i < totalSamples; i++) {
    const sampleOffset = bufOffset + i * bufLen;
    const lap = readVar(buffer, lapVar, sampleOffset);
    const lastLapTime = readVar(buffer, lastLapTimeVar, sampleOffset);

    if (lap !== prevLap && prevLap >= 0) {
      if (lastLapTime > 0 && lastLapTime < 600) {
        laps.push({
          lapNumber: prevLap,
          timeSeconds: lastLapTime,
          timeFormatted: formatLapTime(lastLapTime)
        });
        if (lastLapTime < sessionBestTime) {
          sessionBestTime = lastLapTime;
        }
      }
    }
    prevLap = lap;
  }

  // Also check final best lap time from telemetry
  if (bestLapTimeVar && totalSamples > 0) {
    const lastSampleOffset = bufOffset + (totalSamples - 1) * bufLen;
    const finalBest = readVar(buffer, bestLapTimeVar, lastSampleOffset);
    if (finalBest > 0 && finalBest < sessionBestTime) {
      sessionBestTime = finalBest;
    }
  }

  return {
    fileName,
    date: dateInfo?.date,
    time: dateInfo?.time,
    datetime: dateInfo?.datetime?.toISOString(),
    ...sessionInfo,
    laps,
    bestLapTime: sessionBestTime < Infinity ? sessionBestTime : null,
    bestLapTimeFormatted: sessionBestTime < Infinity ? formatLapTime(sessionBestTime) : null,
    totalLaps: laps.length
  };
}

// Main execution
const monzaDir = path.join(__dirname, '../monza');
const outputDir = path.join(__dirname, '../src/data');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all .ibt files
const files = fs.readdirSync(monzaDir)
  .filter(f => f.endsWith('.ibt'))
  .map(f => path.join(monzaDir, f))
  .sort();

console.log(`Processing ${files.length} .ibt files...\n`);

const sessions = [];
let totalLaps = 0;
let bestOverallTime = Infinity;
let bestOverallFile = null;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const fileName = path.basename(file);
  process.stdout.write(`\r[${i + 1}/${files.length}] ${fileName.substring(0, 50)}...`);

  try {
    const result = processIbtFile(file);
    sessions.push(result);
    totalLaps += result.totalLaps;

    if (result.bestLapTime && result.bestLapTime < bestOverallTime) {
      bestOverallTime = result.bestLapTime;
      bestOverallFile = fileName;
    }
  } catch (err) {
    console.log(`\nError processing ${fileName}: ${err.message}`);
    sessions.push({
      fileName,
      error: err.message
    });
  }
}

console.log('\n\n--- Summary ---');
console.log(`Total sessions: ${sessions.length}`);
console.log(`Total laps recorded: ${totalLaps}`);
console.log(`Best overall lap: ${formatLapTime(bestOverallTime)} (${bestOverallFile})`);

// Group by date for daily best times
const byDate = {};
sessions.forEach(s => {
  if (s.date && s.bestLapTime) {
    if (!byDate[s.date]) {
      byDate[s.date] = {
        date: s.date,
        sessions: 0,
        totalLaps: 0,
        bestTime: Infinity,
        bestTimeFormatted: null,
        track: s.track,
        car: s.car
      };
    }
    byDate[s.date].sessions++;
    byDate[s.date].totalLaps += s.totalLaps;
    if (s.bestLapTime < byDate[s.date].bestTime) {
      byDate[s.date].bestTime = s.bestLapTime;
      byDate[s.date].bestTimeFormatted = s.bestLapTimeFormatted;
    }
  }
});

const dailyBests = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

console.log('\n--- Daily Best Lap Times ---');
dailyBests.forEach(d => {
  console.log(`${d.date}: ${d.bestTimeFormatted} (${d.sessions} sessions, ${d.totalLaps} laps)`);
});

// Save data
const outputData = {
  generated: new Date().toISOString(),
  totalSessions: sessions.length,
  totalLaps,
  bestOverallTime,
  bestOverallTimeFormatted: formatLapTime(bestOverallTime),
  dailyBests,
  sessions: sessions.filter(s => !s.error)
};

const outputFile = path.join(outputDir, 'telemetry-data.json');
fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
console.log(`\nData saved to: ${outputFile}`);

// Also create a simpler summary file
const summaryData = {
  generated: new Date().toISOString(),
  track: 'Autodromo Nazionale Monza',
  trackShort: 'Monza Full',
  car: 'Super Formula Lights 324',
  totalSessions: sessions.length,
  totalLaps,
  bestOverallTime,
  bestOverallTimeFormatted: formatLapTime(bestOverallTime),
  dailyBests
};

const summaryFile = path.join(outputDir, 'summary.json');
fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));
console.log(`Summary saved to: ${summaryFile}`);
