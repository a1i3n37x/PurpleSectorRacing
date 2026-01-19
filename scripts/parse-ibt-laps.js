const fs = require('fs');
const path = require('path');

/**
 * IBT File Parser - Extracts lap times from iRacing telemetry
 *
 * IBT Format:
 * - Header: Contains offsets to session info and telemetry data
 * - Session Info: YAML describing session/track/car
 * - Var Headers: Describes each telemetry channel
 * - Data: Samples at tickRate Hz
 */

function parseIbtHeader(buffer) {
  return {
    version: buffer.readInt32LE(0),
    status: buffer.readInt32LE(4),
    tickRate: buffer.readInt32LE(8),
    sessionInfoUpdate: buffer.readInt32LE(12),
    sessionInfoLen: buffer.readInt32LE(16),
    sessionInfoOffset: buffer.readInt32LE(20),
    numVars: buffer.readInt32LE(24),
    varHeaderOffset: buffer.readInt32LE(28),
    numBuf: buffer.readInt32LE(32),
    bufLen: buffer.readInt32LE(36),
    // buffer info array starts at offset 48
  };
}

function parseVarHeaders(buffer, numVars, offset) {
  const vars = [];
  const VAR_HEADER_SIZE = 144;

  for (let i = 0; i < numVars; i++) {
    const pos = offset + i * VAR_HEADER_SIZE;
    const type = buffer.readInt32LE(pos);
    const dataOffset = buffer.readInt32LE(pos + 4);
    const count = buffer.readInt32LE(pos + 8);
    const countAsTime = buffer.readInt32LE(pos + 12);

    // Name is null-terminated string at pos+16, max 32 chars
    let nameEnd = pos + 16;
    while (nameEnd < pos + 48 && buffer[nameEnd] !== 0) nameEnd++;
    const name = buffer.slice(pos + 16, nameEnd).toString('utf8');

    // Desc at pos+48, Unit at pos+112
    let descEnd = pos + 48;
    while (descEnd < pos + 112 && buffer[descEnd] !== 0) descEnd++;
    const desc = buffer.slice(pos + 48, descEnd).toString('utf8');

    let unitEnd = pos + 112;
    while (unitEnd < pos + 144 && buffer[unitEnd] !== 0) unitEnd++;
    const unit = buffer.slice(pos + 112, unitEnd).toString('utf8');

    vars.push({ name, type, dataOffset, count, desc, unit });
  }

  return vars;
}

function getVarValue(buffer, varHeader, sampleOffset, bufLen) {
  const pos = sampleOffset + varHeader.dataOffset;

  switch (varHeader.type) {
    case 0: // char
      return buffer.readInt8(pos);
    case 1: // bool
      return buffer.readInt8(pos) !== 0;
    case 2: // int
      return buffer.readInt32LE(pos);
    case 3: // bitfield
      return buffer.readInt32LE(pos);
    case 4: // float
      return buffer.readFloatLE(pos);
    case 5: // double
      return buffer.readDoubleLE(pos);
    default:
      return null;
  }
}

function extractSessionInfo(buffer, offset, len) {
  const yaml = buffer.slice(offset, offset + len).toString('utf8').replace(/\0/g, '');

  const trackMatch = yaml.match(/TrackDisplayName:\s*(.+)/);
  const trackShortMatch = yaml.match(/TrackDisplayShortName:\s*(.+)/);
  const carMatch = yaml.match(/CarScreenName:\s*(.+)/);
  const driverMatch = yaml.match(/UserName:\s*(.+)/);
  const estLapMatch = yaml.match(/DriverCarEstLapTime:\s*([\d.]+)/);

  return {
    track: trackMatch ? trackMatch[1].trim() : 'Unknown',
    trackShort: trackShortMatch ? trackShortMatch[1].trim() : 'Unknown',
    car: carMatch ? carMatch[1].trim() : 'Unknown',
    driver: driverMatch ? driverMatch[1].trim() : 'Unknown',
    estimatedLapTime: estLapMatch ? parseFloat(estLapMatch[1]) : null
  };
}

function formatLapTime(seconds) {
  if (!seconds || seconds <= 0 || seconds > 600) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

function parseIbtFile(filePath, options = {}) {
  const { maxSamples = 100000, verbose = false } = options;
  const buffer = fs.readFileSync(filePath);

  const header = parseIbtHeader(buffer);
  const sessionInfo = extractSessionInfo(buffer, header.sessionInfoOffset, header.sessionInfoLen);
  const varHeaders = parseVarHeaders(buffer, header.numVars, header.varHeaderOffset);

  // Find relevant variables
  const lapVar = varHeaders.find(v => v.name === 'Lap');
  const lapTimeVar = varHeaders.find(v => v.name === 'LapCurrentLapTime');
  const lastLapTimeVar = varHeaders.find(v => v.name === 'LapLastLapTime');
  const bestLapTimeVar = varHeaders.find(v => v.name === 'LapBestLapTime');
  const sessionTimeVar = varHeaders.find(v => v.name === 'SessionTime');

  if (verbose) {
    console.log('Found vars:', varHeaders.map(v => v.name).join(', '));
  }

  // Buffer info is at offset 48
  const bufOffset = buffer.readInt32LE(48);
  const bufLen = header.bufLen;

  // Parse telemetry samples to find lap times
  const laps = [];
  let lastLap = -1;
  let lastLapTime = -1;
  let bestLapTime = Infinity;
  let sampleCount = 0;

  // Calculate data start and size
  const dataStart = bufOffset;
  const totalSamples = Math.floor((buffer.length - dataStart) / bufLen);
  const samplesToCheck = Math.min(totalSamples, maxSamples);

  if (verbose) {
    console.log(`Total samples: ${totalSamples}, checking: ${samplesToCheck}`);
  }

  for (let i = 0; i < samplesToCheck; i++) {
    const sampleOffset = dataStart + i * bufLen;

    const currentLap = lapVar ? getVarValue(buffer, lapVar, sampleOffset, bufLen) : 0;
    const currentLapTime = lapTimeVar ? getVarValue(buffer, lapTimeVar, sampleOffset, bufLen) : 0;
    const lastLapTimeVal = lastLapTimeVar ? getVarValue(buffer, lastLapTimeVar, sampleOffset, bufLen) : 0;
    const bestLapTimeVal = bestLapTimeVar ? getVarValue(buffer, bestLapTimeVar, sampleOffset, bufLen) : 0;

    // Detect lap completion
    if (currentLap > lastLap && lastLap >= 0) {
      // Lap completed
      if (lastLapTimeVal > 0 && lastLapTimeVal < 600) {
        laps.push({
          lap: lastLap,
          time: lastLapTimeVal
        });
        if (lastLapTimeVal < bestLapTime) {
          bestLapTime = lastLapTimeVal;
        }
      }
    }

    lastLap = currentLap;
    lastLapTime = lastLapTimeVal;
    sampleCount++;
  }

  // Check for any remaining best lap time from the data
  if (bestLapTimeVar) {
    // Read last sample for final best lap
    const lastSampleOffset = dataStart + (samplesToCheck - 1) * bufLen;
    const finalBest = getVarValue(buffer, bestLapTimeVar, lastSampleOffset, bufLen);
    if (finalBest > 0 && finalBest < bestLapTime) {
      bestLapTime = finalBest;
    }
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    sessionInfo,
    tickRate: header.tickRate,
    totalSamples,
    samplesChecked: sampleCount,
    laps,
    bestLapTime: bestLapTime < Infinity ? bestLapTime : null,
    totalLaps: laps.length
  };
}

// Parse filename to extract date
function parseDateFromFilename(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}-\d{2}-\d{2})\.ibt$/);
  if (match) {
    const [_, date, time] = match;
    const [hour, min, sec] = time.split('-');
    return new Date(`${date}T${hour}:${min}:${sec}`);
  }
  return null;
}

// Main - process all files in monza directory
const monzaDir = path.join(__dirname, '../monza');
const files = fs.readdirSync(monzaDir)
  .filter(f => f.endsWith('.ibt'))
  .map(f => path.join(monzaDir, f));

console.log(`Found ${files.length} .ibt files\n`);

// Process a few files to test
const testFiles = files.slice(0, 5);
const results = [];

for (const file of testFiles) {
  console.log(`Processing: ${path.basename(file)}`);
  try {
    const result = parseIbtFile(file, { maxSamples: 500000 });
    results.push(result);
    console.log(`  Track: ${result.sessionInfo.track}`);
    console.log(`  Car: ${result.sessionInfo.car}`);
    console.log(`  Laps: ${result.totalLaps}`);
    console.log(`  Best: ${formatLapTime(result.bestLapTime)}`);
    console.log('');
  } catch (err) {
    console.log(`  Error: ${err.message}\n`);
  }
}

// Summary
console.log('--- Summary ---');
const validResults = results.filter(r => r.bestLapTime);
if (validResults.length > 0) {
  const overallBest = Math.min(...validResults.map(r => r.bestLapTime));
  console.log(`Overall Best Lap: ${formatLapTime(overallBest)}`);
}
