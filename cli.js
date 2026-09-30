'use strict';

const { searchRepos, getRepo, getRepoBySlug, GitHubError, formatStars } = require('./explorer.js');

function parseArgs(argv) {
  const args = { action: null, query: null, limit: 10 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit' || a === '-n') {
      args.limit = parseInt(argv[++i], 10);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else {
      positional.push(a);
    }
  }
  args.action = positional[0] || null;
  args.query = positional.slice(1).join(' ');
  return args;
}

function printRepo(r, index) {
  const idx = index === undefined ? '' : `${index}. `;
  const license = r.license ? ` [${r.license}]` : '';
  console.log(`${idx}${r.fullName}${license}`);
  if (r.description) console.log(`    ${r.description}`);
  const meta = [
    `${formatStars(r.stars)} stars`,
    `${r.forks} forks`,
    r.language ? r.language : 'no language',
    `${r.openIssues} issues`,
    r.homepage ? r.homepage : '',
  ].filter(Boolean).join(' | ');
  console.log(`    ${meta}`);
  console.log(`    ${r.htmlUrl}`);
  console.log('');
}

function printHelp() {
  console.log('Usage: node cli.js <search | repo> <query> [--limit N]');
  console.log('');
  console.log('Examples:');
  console.log('  node cli.js search "machine learning"');
  console.log('  node cli.js search node --limit 5');
  console.log('  node cli.js repo HSJplayz/streak');
  console.log('');
  console.log('Commands:');
  console.log('  search <query>   search GitHub repositories, sorted by stars');
  console.log('  repo <owner/name> show a single repository in detail');
  console.log('  -n, --limit N    max results for search (default 10)');
  console.log('  -h, --help       show this help');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.action || !args.query) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  try {
    if (args.action === 'search') {
      const result = await searchRepos(args.query, { limit: args.limit });
      console.log(`Found ${result.total} repositories for "${args.query}". Showing ${result.items.length}:`);
      console.log('');
      result.items.forEach((r, i) => printRepo(r, i + 1));
    } else if (args.action === 'repo') {
      const r = await getRepoBySlug(args.query);
      printRepo(r);
    } else {
      console.error(`Unknown command: ${args.action}`);
      printHelp();
      process.exitCode = 1;
    }
  } catch (err) {
    if (err instanceof GitHubError) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    } else {
      throw err;
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});