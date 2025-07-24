'use strict';

const { readdirSync, statSync, } = require('node:fs');
const { extname, resolve, basename, } = require('node:path');
const esm = require("./esm.mjs");

const ALLOWED_EXTS = ['.js', '.cjs', '.mjs', '.json', '.ts'];
const moduleProto = esm[Symbol.toStringTag];

const isClass = entity => entity.toString().startsWith('class');
const isPrimitive = entity =>
  typeof entity !== "object" && typeof entity !== "function";
const { freeze, keys, getPrototypeOf, assign } = Object;

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
  const api = {};
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
  if (getPrototypeOf(module) !== Object.prototype) {
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

const _module = (path, { context, loadOnly = [] } = {}) => {
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
      loadOnly: loadOnly.includes(name),
    };
    if (module?.__esModule && module?.default !== undefined) {
      result[name] = _default(module?.default, options);
    } else {
      const loaded = api(module, options);
      const needCleaning = loaded?.[Symbol.toStringTag] === moduleProto;
      result[name] = needCleaning ? assign({}, loaded) : loaded;
    }
  }
  return freeze(result);
};

const dir = (path, { context = {}, shared } = {}) => {
  const api = {};
  for (const member of readdirSync(path, 'utf-8')) {
    if (!statSync(resolve(path, member)).isDirectory()) continue;
    api[member] = _module(
      resolve(path, member),
      context[member] ?? shared,
    );
  }
  return freeze(api);
};

const file = (path, options = {}) => {
  if (!ALLOWED_EXTS.includes(extname(path))) return;
  const module = require(path);
  if (module?.__esModule && module?.default !== undefined) {
    return _default(module.default, options);
  } else {
    if (isPrimitive(module)) return module;
    if (getPrototypeOf(module) !== Object.prototype) {
      return _default(module, options);
    }
    return module;
  }
};

const root = (path, options = {}) => {
  const dir = readdirSync(path, 'utf-8');
  const indexPath = dir.find(file => {
    return file.startsWith("index") &&
      !statSync(resolve(path, file)).isDirectory();
  });
  if (indexPath === undefined) {
    throw new Error("Can't find index file");
  }
  const filepath = resolve(path, indexPath);
  const index = file(filepath, options);
  if (isPrimitive(index)
    || index === null
    || typeof index === 'function'
  ) return freeze(index);
  return freeze({ ...index });
};

const noDI = () => ({ includes() { return true } });

module.exports = {
  node,
  npm,
  module: _module,
  dir,
  noDI,
  root,
  file,
};
