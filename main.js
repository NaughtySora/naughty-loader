'use strict';

const { readdirSync, statSync, } = require('node:fs');
const { extname, resolve, basename, } = require('node:path');
const { freeze, keys } = Object;
const esm = require("./esm.mjs");

const ALLOWED_EXTS = ['.js', '.cjs', '.mjs', '.json'];
const isClass = entity => entity.toString().startsWith('class');
const isPrimitive = entity => typeof entity !== "object" && typeof entity !== "function";
const moduleProto = esm[Symbol.toStringTag];

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
  if (!Array.isArray(modules)) {
    throw new Error("Modules list should be an array");
  }
  const api = [];
  for (const module of modules) {
    const lib = require(`node:${module}`);
    api[module] = lib?.default ?? lib;
  }
  return freeze(api);
};

const _default = (module, { context, loadOnly = false }) => {
  if (typeof module === 'function') {
    if (loadOnly || isClass(module)) return module;
    return module(context);
  }
  return module;
};

const api = (module, options) => {
  if (isPrimitive(module)) return module;
  if (Object.getPrototypeOf(module) !== Object.prototype) {
    return _default(module, options);
  }
  const api = {};
  for (const key of keys(module)) {
    const entity = module[key];
    if (entity === 'function') {
      api[key] = entity(context);
    }
    else api[key] = entity;
  }
  return freeze(api);
};

const _module = (path, { context, justLoad = [] } = {}) => {
  let count = 0;
  const result = {};
  for (const member of readdirSync(path, 'utf-8')) {
    const memberPath = resolve(path, member);
    if (statSync(memberPath).isDirectory()) continue;
    const ext = extname(member);
    if (!ALLOWED_EXTS.includes(ext)) continue;
    const module = require(memberPath);
    const name = basename(member, ext);
    const options = {
      context,
      loadOnly: justLoad.includes(name),
    };
    if (module?.default !== undefined) {
      result[name] = _default(module?.default, options);
    } else {
      const loaded = api(module, options);
      const needCleaning = loaded[Symbol.toStringTag] === moduleProto;
      result[name] = needCleaning ? Object.assign({}, loaded) : loaded;
    }
    count++;
  }

  const index = result.index;
  if (count === 1 && index !== undefined) {
    if (typeof index === 'function') return freeze(index);
    return freeze({ ...index });
  }
  return freeze(result);
};

const dir = (path, options = {}) => {
  const app = {};
  for (const member of readdirSync(path, 'utf-8')) {
    app[member] = _module(resolve(path, member), options);
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
