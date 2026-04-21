#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
}

function getGitBranch(rootDir) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: rootDir,
      encoding: 'utf8'
    }).trim();

    return branch && branch !== 'HEAD' ? branch : 'main';
  } catch (error) {
    return 'main';
  }
}

function getRepositoryPath(packageJson) {
  const repo = packageJson.repository;
  const url = typeof repo === 'string' ? repo : repo && repo.url;

  if (!url) {
    throw new Error('package.json is missing repository.url');
  }

  const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Unsupported repository URL: ${url}`);
  }

  return match[1];
}

const packageJson = readPackageJson();
const branch = getGitBranch(ROOT);
const repoPath = getRepositoryPath(packageJson);
const rawBase = `https://raw.githubusercontent.com/${repoPath}/${branch}/dist`;

const plugin = {
  author: 'Mike Diehn',
  id: 'range-rings',
  name: 'IITC plugin: Range Rings',
  category: 'Layer',
  version: packageJson.version || '1.3.0',
  namespace: `https://github.com/${repoPath}`,
  updateURL: `${rawBase}/range-rings.meta.js`,
  downloadURL: `${rawBase}/range-rings.user.js`,
  description: 'Draw concentric range circles from draggable center points.',
  matches: [
    '*://intel.ingress.com/*'
  ],
  includes: [
    'https://intel.ingress.com/*',
    'http://intel.ingress.com/*'
  ],
  grant: 'none'
};

const sourceFiles = [
  'src/banner.js',
  'src/wrapper-start.js',
  'src/constants.js',
  'src/state.js',
  'src/util.js',
  'src/model.js',
  'src/storage.js',
  'src/render.js',
  'src/ui.js',
  'src/actions.js',
  'src/interaction.js',
  'src/wrapper-end.js'
];

function buildHeader() {
  const lines = [
    '// ==UserScript==',
    `// @author         ${plugin.author}`,
    `// @id             ${plugin.id}`,
    `// @name           ${plugin.name}`,
    `// @category       ${plugin.category}`,
    `// @version        ${plugin.version}`,
    `// @namespace      ${plugin.namespace}`,
    `// @updateURL      ${plugin.updateURL}`,
    `// @downloadURL    ${plugin.downloadURL}`,
    `// @description    ${plugin.description}`
  ];

  for (const match of plugin.matches) {
    lines.push(`// @match          ${match}`);
  }

  for (const include of plugin.includes) {
    lines.push(`// @include        ${include}`);
  }

  lines.push(`// @grant          ${plugin.grant}`);
  lines.push('// ==/UserScript==');

  return lines.join('\n') + '\n';
}

function readSources() {
  return sourceFiles
    .map((relativePath) => {
      const fullPath = path.join(ROOT, relativePath);
      return fs.readFileSync(fullPath, 'utf8').replace(/\s+$/, '');
    })
    .join('\n\n') + '\n';
}

function main() {
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const header = buildHeader();
  const body = readSources();

  fs.writeFileSync(
    path.join(DIST_DIR, 'range-rings.user.js'),
    `${header}\n${body}`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(DIST_DIR, 'range-rings.meta.js'),
    header,
    'utf8'
  );

  console.log(`Building ${plugin.id} from ${repoPath} on branch ${branch}`);
  console.log('Wrote dist/range-rings.user.js');
  console.log('Wrote dist/range-rings.meta.js');
}

main();