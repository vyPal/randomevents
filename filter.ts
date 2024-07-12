import { writeFile, readFile } from 'fs/promises';

function matchPath(path: string, pattern: string, matchFull: boolean): boolean {
  const pathSegments = path.split(".");
  const patternSegments = pattern.split(".");


  let regexPattern = "^";
  patternSegments.forEach((segment, index) => {
    if ((index >= pathSegments.length) && !matchFull) {
      return; // Přeskočit generování regex pro segmenty mimo rozsah cesty
    }

    if (segment === "*") {
      regexPattern += "[^\\.]+";
    } else if (segment === "**") {
      regexPattern += ".*";
    } else {
      if (index > 0) {
        regexPattern += "\\.";
      }
      const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regexPattern += escapedSegment;

      if (index < patternSegments.length - 2) {
        regexPattern += "\\.";
      }
    }
  });

  regexPattern += "$";
  
  const regex = new RegExp(regexPattern);
  console.log(regexPattern, "=>", path, "===>", regex.test(path)); // Debug log
  return regex.test(path);
}

function omitKeys(obj: any, patterns: string[]): any {
  const patternSegmentsList = patterns.map(pattern => pattern.split('.'));

  function omit(obj: any, path: string[] = []): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => omit(item, path));

    return Object.entries(obj).reduce((acc: { [key: string]: any }, [key, value]) => {
      const newPath = [...path, key];
      const fullPath = newPath.join(".");
      const shouldOmit = patternSegmentsList.some(patternSegments =>
        matchPath(fullPath, patternSegments.join("."), true)
      );
      if (!shouldOmit) acc[key] = omit(value, newPath);
      return acc;
    }, {});
  }

  return omit(obj);
}

function includeKeys(obj: any, patterns: string[]): any {
  const patternSegmentsList = patterns.map(pattern => pattern.split('.'));

  function include(obj: any, path: string[] = []): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => include(item, path));

    return Object.entries(obj).reduce((acc: { [key: string]: any }, [key, value]) => {
      const newPath = [...path, key];
      const fullPath = newPath.join(".");
      const shouldInclude = patternSegmentsList.some(patternSegments =>
        matchPath(fullPath, patternSegments.join("."), false)
      );
      if (shouldInclude) acc[key] = include(value, newPath);
      return acc;
    }, {});
  }

  return include(obj);
}

function generateStructure(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(generateStructure);

  return Object.keys(obj).reduce((acc: any, key) => {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      acc[key] = generateStructure(obj[key]);
    } else {
      if (!acc.__keys) acc.__keys = [];
      acc.__keys.push(key);
    }
    return acc;
  }, {});
}

async function saveStatsAndStructure(playerStats: any, partsToInclude: string[], partsToOmit: string[]): Promise<void> {
  try {
    const filteredStats = omitKeys(includeKeys(playerStats, partsToInclude), partsToOmit);
    const structure = generateStructure(filteredStats);

    await writeFile('filteredStats.json', JSON.stringify(filteredStats, null, 2), 'utf8');
    await writeFile('structure.json', JSON.stringify(structure, null, 2), 'utf8');

    console.log('Files saved successfully.');
  } catch (error) {
    console.error('Failed to save files:', error);
  }
}

async function loadStats(): Promise<any> {
  try {
    const stats = await readFile('playerStats.json', 'utf8');
    return JSON.parse(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
    return null;
  }
}

const partsToInclude = [
  "skywars.**",
  "bedwars.**",
  "duels.wins",
  "duels.losses",
  "pit.kills",
  "pit.deaths",
  "pit.assists",
  "pit.damageReceived",
  "pit.damageDealt",
  "pit.meleeAccuracy",
];
const partsToOmit = [
  "**.coins",
  "**.tokens",
  "**.souls",
  "**.packages",
  "bedwars.practice",
  "bedwars.totalSlumberTicket",
  "bedwars.slumberTickets",
  "bedwars.dream",
  "bedwars.castle",
  "**.avg",
  "bedwars.collectedItemsTotal",
  "**.experience",
  "**.prestige",
  "**.BLRatio",
  "**.winstreak",
  "skywars.heads",
  "skywars.levelFormatted",
  "skywars.prestigeIcon",
  "skywars.opals",
  "skywars.avarice",
  "skywars.tenacity",
  "skywars.shards",
  "skywars.angelOfDeathLevel",
  "skywars.shardsInMode",
  "**.normal",
  "**.insane",
  "**.mega",
  "**.lab",
  "skywars.levelProgress",
  "**.KDRatio",
  "**.WLRatio",
  "**.finalKDRatio"
];

const playerStats = await loadStats();
if (playerStats) {
  saveStatsAndStructure(playerStats, partsToInclude, partsToOmit);
}