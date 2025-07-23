'use strict';

const { readdirSync } = require('node:fs');
const { extname, resolve, basename } = require('node:path');
const { freeze, keys } = Object;

const ALLOWED_EXTS = ['.js', '.cjs', '.mjs', '.json', '.ts',];

const isClass = entity => entity.toString().startsWith('class');

const npm = (path, { omit = [], rename = {} } = {}) => {
  const json = require(path);
  const dependencies = json?.dependencies;
  if (typeof dependencies !== 'object' || dependencies === null) {
    throw new Error(`Can't find package json dependencies in ${path}`);
  }
  const npm = {};
  for (const lib of keys(dependencies)) {
    if (omit.includes(lib)) continue;
    const module = require(lib);
    npm[rename[lib] ?? lib] = freeze(module?.default ?? module);
  }
  return freeze(npm);
};

const node = modules => {
  const api = [];
  for (const module of modules) {
    const lib = require(`node:${module}`);
    api[module] = lib?.default ?? lib;
  }
  return freeze(api);
};

const api = (module, context) => {
  const api = {};
  for (const key of keys(module)) {
    const entity = module[key];
    if (entity === 'function') api[key] = entity(context);
    api[key] = entity;
  }
  return api;
};

const _default = (module, context) => {
  if (typeof module === 'function') {
    if (isClass(module)) return module;
    return module(context);
  }
  return module;
};

const _module = (path, context = {}) => {
  let count = 0;
  const result = {};
  for (const member of readdirSync(path, 'utf-8')) {
    const ext = extname(member);
    if (!ALLOWED_EXTS.includes(ext)) continue;
    const module = require(resolve(path, member));
    result[basename(member, ext)] =
      freeze(module?.default !== undefined ?
        _default(module, context)
        : api(module, context)
      );
    count++;
  }
  const index = result.index;
  if (count === 1 && index !== undefined) {
    if (typeof index === 'function') return freeze(index);
    return freeze({ ...index });
  }
  return freeze(result);
};

const dir = (path, context) => {
  const app = {};
  for (const member of readdirSync(path, 'utf-8')) {
    app[member] = _module(resolve(path, member), context);
  }
  return freeze(app);
};

module.exports = {
  node,
  dir,
  npm,
  module: _module,
  isClass,
};
