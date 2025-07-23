'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const loader = require('../main');
const path = require('node:path');
const { mkdirSync, writeFileSync, accessSync, rmSync } = require('node:fs');

const findPackage = query => path.resolve(__dirname, 'packages', query);
const getPackageJSONDependencies = (path) => Object.keys(require(path).dependencies);

const emulator = {
  nodeModules: {
    create: libs => {
      const node = 'node_modules';
      try {
        accessSync(node);
      } catch {
        mkdirSync(node);
      }
      for (const lib of libs) {
        const libPath = path.resolve(node, lib);
        try {
          accessSync(libPath);
        } catch {
          mkdirSync(libPath);
        }
        writeFileSync(path.resolve(libPath, 'package.json'), `{
  "name": "${lib}",
  "version": "1.0.0",
  "main": "main.js"
}`);
        writeFileSync(path.resolve(libPath, 'main.js'),
          `'use strict';
module.exports = {
  "${lib}": true
};
`);
      }
    },
    delete() {
      rmSync('node_modules', { recursive: true });
    }
  },
};

describe('Loader', () => {
  describe('npm', () => {
    const packages = [
      findPackage('1-package.json'),
      findPackage('2-package.json'),
      findPackage('3-package.json'),
      findPackage('4-package.json'),
      findPackage('5-package.json'),
    ];

    it('valid', () => {
      const lib1 = getPackageJSONDependencies(packages[0]);
      emulator.nodeModules.create(lib1);
      const npm1 = loader.npm(packages[0]);
      for (const module of lib1) {
        const api = npm1[module];
        assert.strictEqual(api[module], true);
      }
      emulator.nodeModules.delete();

      const lib2 = getPackageJSONDependencies(packages[1]);
      emulator.nodeModules.create(lib2);
      const npm2 = loader.npm(packages[1]);
      for (const module of lib2) {
        const api = npm2[module];
        assert.strictEqual(api[module], true);
      }
      emulator.nodeModules.delete();
    });

    it('throws', () => {
      assert.throws(() => loader.npm());
      assert.throws(() => loader.npm(packages[2]));
      assert.throws(() => loader.npm(packages[3]));
      assert.throws(() => loader.npm(packages[4]));
      assert.throws(() => loader.npm(''));
    });

    it('rename', () => {
      const libs = getPackageJSONDependencies(packages[0]);
      emulator.nodeModules.create(libs);
      const rename = {
        pg: 'postgres',
        'naughty-util': 'util',
        something: 'a',
      };
      const npm = loader.npm(packages[0], { rename });
      assert.ok(npm.postgres !== undefined);
      assert.ok(npm.util !== undefined);
      assert.ok(npm.pg === undefined);
      assert.ok(npm['naughty-util'] === undefined);
      assert.strictEqual(npm.postgres.pg, true);
      assert.strictEqual(npm.util['naughty-util'], true);
      assert.ok(npm.a === undefined);
      assert.ok(npm.something === undefined);
      emulator.nodeModules.delete();
    });

    it('omit', () => {
      const libs = getPackageJSONDependencies(packages[0]);
      emulator.nodeModules.create(libs);
      const omit = ['naughty-pool', 'ws', 'prisma'];
      const npm = loader.npm(packages[0], { omit });
      assert.ok(npm.ws === undefined);
      assert.ok(npm['naughty-pool'] === undefined);
      assert.ok(npm.prisma === undefined);
      assert.strictEqual(Object.keys(npm).length, libs.length - omit.length);
      emulator.nodeModules.delete();
    });
  });

  // describe('node', () => {

  // });

  // describe('module', () => {

  // });

  // describe('dir', () => {

  // });
});