#!/usr/bin/env node
/* eslint no-await-in-loop: 0 */

let axios = require('axios')
  , extract = require('extract-zip')
  , { retry, forEachOf } = require('async')
  , { createWriteStream, mkdirSync, rmdirSync } = require('fs')
  , { join } = require('path')
  , notionAPI = 'https://www.notion.so/api/v3'
  , { BACKUP_DIRS, NOTION_TOKENS, NOTION_SPACE_IDS, NOTION_USER_IDS, EXPORT_TYPE } = process.env
  , die = (str) => {
      console.error(str);
      process.exit(1);
    }
;

// SETUP ===========================================================================================
if (!NOTION_TOKENS || !NOTION_SPACE_IDS) {
  die(`You need to have all secrets defined in the environment. Are you missing any of these?
BACKUP_DIRS, NOTION_SPACE_IDS, NOTION_USER_IDS, NOTION_TOKENS.

See https://medium.com/@arturburtsev/automated-notion-backups-f6af4edc298d for
notes on how to get that information.`);
}

var backupDirs = BACKUP_DIRS.split(";").map(item => item.trim());
var spaceIds = NOTION_SPACE_IDS.split(";").map(item => item.trim());
var userIds = NOTION_USER_IDS.split(";").map(item => item.trim());
var notionTokens = NOTION_TOKENS.split(";").map(item => item.trim());

// This works because it's transitive...
if (backupDirs.length != spaceIds.length
    || spaceIds.length != userIds.length
    || userIds.length != notionTokens.length) {
  die(`The length of your BACKUP_DIRS, NOTION_SPACE_IDS, ` +
      `NOTION_USER_IDS and NOTION_TOKENS must be equal!!`);
}

if (spaceIds[0] === "*" || notionTokens[0] === "*") {
  die(`The first element of NOTION_TOKENS or NOTION_SPACE_IDS cannot be *!!`);
}

if (!EXPORT_TYPE) {
  EXPORT_TYPE = "";
}

for (const index in backupDirs) {
  // Replace * with closest preceding non-* entry
  if (notionTokens[index] != "*") {
    notionToken = notionTokens[index];
  } else {
    notionTokens[index] = notionToken;
  }

  if (userIds[index] != "*") {
    userId = userIds[index];
  } else {
    userIds[index] = userId;
  }
}

// UTILITY FUNCTIONS ===============================================================================
async function sleep (seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

// formats: markdown, html
async function exportFromNotion (format, spaceId, notionToken, userId, backupDir) {
  try {
    let client = axios.create({
      baseURL: notionAPI,
      headers: {
        Cookie: `token_v2=${notionToken}; notion_user_id:${userId}`,
        'x-notion-active-user-header': `${userId}`,
      },
    })

    let { data: { taskId }, request } = await client.post('enqueueTask', {
      task: {
        eventName: 'exportSpace',
        request: {
          spaceId: spaceId,
          exportOptions: {
            exportType: format,
            timeZone: 'America/New_York',
            locale: 'en',
          },
        },
        actor: {
          table: 'notion_user',
          id: userId,
        },
      },
    });

    console.warn(`Enqueued task ${taskId} (${backupDir}/${format})`);

    let failCount = 0
      , exportURL
    ;

    // Wait for exported files to generate
    while (true) {
      if (failCount >= 10) break;
      await sleep(10);
      let { data: { results: tasks } } = await retry(
        { times: 10, interval: 2000 },
        async () => client.post('getTasks', { taskIds: [taskId] })
      );

      let task = tasks.find(t => t.id === taskId);

      if (!task) {
        failCount++;
        console.warn(`No task, waiting.`);
        continue;
      }
      if (!task.status) {
        failCount++;
        console.warn(`No task status, waiting. Task was:\n${JSON.stringify(task, null, 2)}`);
        continue;
      }

      if (task.state === 'in_progress') {
        console.warn(`\nWait... Export generating...: ${task.status.pagesExported} `
                     + `(${backupDir}/${format})\n`);
      }
      if (task.state === 'failure') {
        failCount++;
        console.warn(`Task error: ${task.error}`);
        continue;
      }
      if (task.state === 'success') {
        exportURL = task.status.exportURL;
        console.warn(`*** DONE *** | Pages exported: ${task.status.pagesExported} `
                     + `(${backupDir}/${format})`);
        break;
      }
    }

    let res = await client({
      method: 'GET',
      url: exportURL,
      responseType: 'stream'
    });

    let stream = res.data.pipe(createWriteStream(join(process.cwd(),
                                                 `${backupDir}/${format}.zip`)));

    await new Promise((resolve, reject) => {
      stream.on('close', resolve);
      stream.on('error', reject);
    });
  }
  catch (err) {
    console.warn(err);
    die(err);
  }
}  // exportFromNotion()

// MAIN LOOP =======================================================================================
async function run () {
  let cwd = process.cwd();

  // EXPORT_TYPE should be "", markdown, or html
  // If empty, both types will be exported
  function pathFn (dir, formatType) {
    return join(cwd, dir, formatType);
  }

  let backupDir, notionToken, spaceId, userId;

  async function exportDispatch (index) {
    var backupDir = backupDirs[index];
    var notionToken = notionTokens[index];
    var spaceId = spaceIds[index];
    var userId = userIds[index];

    async function exportExtract (format) {
      await exportFromNotion(format, spaceId, notionToken, userId, backupDir);
      rmdirSync(pathFn(backupDir, format), { recursive: true });
      mkdirSync(pathFn(backupDir, format), { recursive: true });
      await extract(pathFn(backupDir, format + '.zip'), { dir: pathFn(backupDir, format) });
    }

    mkdirSync(join(cwd, backupDir), { recursive: true });

    switch (EXPORT_TYPE.toLowerCase()) {
      case 'markdown':
        console.log("Exporting", EXPORT_TYPE.toLowerCase(), " for", backupDir);
        await exportExtract('markdown');
        break;

      case 'html':
        console.log("Exporting", EXPORT_TYPE.toLowerCase(), " for", backupDir);
        await exportExtract('html');
        break;

      default:
        console.log("No export format specified. Exporting markdown and html for", backupDir);
        let [r1, r2] = await Promise.all([
          exportExtract('markdown'),
          exportExtract('html')
        ])
    }
  }  // exportDispatch()

  forEachOf(backupDirs, async function exportDispatchCaller(value, index, callback) {
    try {
      await exportDispatch(index);
    }
    catch (err) {
      die(err);
    }
  });

}

run();
