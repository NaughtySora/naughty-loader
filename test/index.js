'use strict';

const assert = require('node:assert');
const { describe, it, after } = require('node:test');
const { EventEmitter } = require("node:events");
const loader = require('../main');
const path = require('node:path');
const { mkdirSync, writeFileSync, accessSync, rmSync } = require('node:fs');
const { builtinModules } = require('node:module');

const findPackage = query => path.resolve(__dirname, 'packages', query);
const getPackageJSONDependencies = (path) => Object.keys(require(path).dependencies);

process.removeAllListeners('warning');

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

  describe('node', () => {
    const modules = ["http", "http2"];
    const http = require("http");
    const http2 = require("http2");

    it('valid', () => {
      const node = loader.node(modules);
      assert.strictEqual(node.http, http);
      assert.strictEqual(node.http2, http2);
      const fullApi = loader.node(builtinModules);
      assert.strictEqual(Object.keys(fullApi).length, builtinModules.length);
    });


    it('throws', () => {
      assert.throws(() => loader.node(["some"]));
      assert.throws(() => loader.node({}));
    });
  });

  describe('module', () => {
    const folders = {
      cjs: path.resolve(__dirname, "modules/cjs"),
      mjs: path.resolve(__dirname, "modules/mjs"),
      js: path.resolve(__dirname, "modules/js"),
      json: path.resolve(__dirname, "modules/json"),
      jsonEmpty: path.resolve(__dirname, "modules/json/empty"),
    };
    const loaded = {
      cjs: null,
      mjs: null,
      js: null,
      json: null,
    };

    const expected = {
      cjs: {
        api: { a: 1, b: 2 },
        array: [1, 2, 3],
        bool: true,
        class: class { },
        empty: {},
        function: x => x,
        di_function: { test: 1 },
        map: new Map(),
        named: {
          test: "a",
          test2: {},
        },
        'obj-class': new (class A {
          constructor(name) {
            this.name = name;
            this.length = 0;
          }

          method1() {

          }

          #hidden() {

          }

          _internal() {

          }
        })(),
        primitive: 'primitive',
        symbol: Symbol(),
        'not-direct-obj': new (class B extends EventEmitter {
          constructor() {
            super();
          }

          test() {
            throw new Error("B - test");
          }
        })(),
        number: 0xFFFF,
      },
    };

    after(() => {
      const api = loader.dir(path.resolve(__dirname, "modules"), { context: { test: 1 } });
      assert.deepStrictEqual(loaded.cjs, api.cjs);
      assert.deepStrictEqual(loaded.mjs, api.mjs);
      assert.deepStrictEqual(loaded.js, api.js);
      assert.deepStrictEqual(loaded.json, api.json);
    });

    it('.cjs', () => {
      const cjs = loaded.cjs = loader.module(folders.cjs, { context: { test: 1 } });
      const no_context = loader.module(folders.cjs, { justLoad: ["function"] });
      assert.deepStrictEqual(cjs.api, expected.cjs.api);
      assert.deepStrictEqual(cjs.array, expected.cjs.array);
      assert.deepStrictEqual(cjs.bool, expected.cjs.bool);
      assert.deepStrictEqual(cjs.empty, expected.cjs.empty);
      assert.deepStrictEqual(cjs.function, expected.cjs.di_function);
      assert.deepStrictEqual(cjs.map, expected.cjs.map);
      assert.deepStrictEqual(cjs.named, expected.cjs.named);
      assert.deepStrictEqual(cjs.number, expected.cjs.number);
      assert.deepStrictEqual(cjs.primitive, expected.cjs.primitive);

      // can't compare direct
      assert.ok(cjs['not-direct-obj'].toString()
        === expected.cjs['not-direct-obj'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(cjs['not-direct-obj']),
        Object.getPrototypeOf(expected.cjs['not-direct-obj'])
      );

      // can't compare direct
      assert.ok(cjs['obj-class'].toString()
        === expected.cjs['obj-class'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(cjs['obj-class']),
        Object.getPrototypeOf(expected.cjs['obj-class'])
      );

      // can't compare symbols
      assert.ok(cjs.symbol.toString()
        === expected.cjs.symbol.toString());
      assert.ok(Object.getPrototypeOf(cjs.symbol)
        === Object.getPrototypeOf(expected.cjs.symbol));

      // reference different, the function name initially is id, but mapped to function
      // so only here we compare just function body;
      assert.ok(no_context.function.toString() === expected.cjs.function.toString());
    });

    it('.mjs', () => {
      const mjs = loaded.mjs = loader.module(folders.mjs, { context: { test: 1 } });
      const no_context = loader.module(folders.mjs, { justLoad: ["function"] });
      assert.deepStrictEqual(mjs.api, expected.cjs.api);
      assert.deepStrictEqual(mjs.array, expected.cjs.array);
      assert.deepStrictEqual(mjs.bool, expected.cjs.bool);
      assert.deepStrictEqual(mjs.empty, expected.cjs.empty);
      assert.deepStrictEqual(mjs.function, expected.cjs.di_function);
      assert.deepStrictEqual(mjs.map, expected.cjs.map);
      assert.deepStrictEqual(mjs.named, expected.cjs.named);
      assert.deepStrictEqual(mjs.number, expected.cjs.number);
      assert.deepStrictEqual(mjs.primitive, expected.cjs.primitive);

      // can't compare direct
      assert.ok(mjs['not-direct-obj'].toString()
        === expected.cjs['not-direct-obj'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(mjs['not-direct-obj']),
        Object.getPrototypeOf(expected.cjs['not-direct-obj'])
      );

      // can't compare direct
      assert.ok(mjs['obj-class'].toString()
        === expected.cjs['obj-class'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(mjs['obj-class']),
        Object.getPrototypeOf(expected.cjs['obj-class'])
      );

      // can't compare symbols
      assert.ok(mjs.symbol.toString()
        === expected.cjs.symbol.toString());
      assert.ok(Object.getPrototypeOf(mjs.symbol)
        === Object.getPrototypeOf(expected.cjs.symbol));

      // reference different, the function name initially is id, but mapped to function
      // so only here we compare just function body;
      assert.ok(no_context.function.toString() === expected.cjs.function.toString());
    });

    it('.js', () => {
      const js = loaded.js = loader.module(folders.js, { context: { test: 1 } });
      const no_context = loader.module(folders.js, { justLoad: ['function'] });

      assert.deepStrictEqual(js.api, expected.cjs.api);
      assert.deepStrictEqual(js['api-mjs'], expected.cjs.api);

      assert.deepStrictEqual(js.array, expected.cjs.array);
      assert.deepStrictEqual(js['array-mjs'], expected.cjs.array);

      assert.deepStrictEqual(js.bool, expected.cjs.bool);
      assert.deepStrictEqual(js['bool-mjs'], expected.cjs.bool);

      assert.deepStrictEqual(js.empty, expected.cjs.empty);
      assert.deepStrictEqual(js['empty-mjs'], expected.cjs.empty);

      assert.deepStrictEqual(js.function, expected.cjs.di_function);
      assert.deepStrictEqual(js['function-mjs'], expected.cjs.di_function);

      assert.deepStrictEqual(js.map, expected.cjs.map);
      assert.deepStrictEqual(js['map-mjs'], expected.cjs.map);

      assert.deepStrictEqual(js.named, expected.cjs.named);
      assert.deepStrictEqual(js['named-mjs'], expected.cjs.named);

      assert.deepStrictEqual(js.number, expected.cjs.number);
      assert.deepStrictEqual(js['number-mjs'], expected.cjs.number);

      assert.deepStrictEqual(js.primitive, expected.cjs.primitive);
      assert.deepStrictEqual(js['primitive-mjs'], expected.cjs.primitive);

      // can't compare direct
      assert.ok(js['not-direct-obj'].toString()
        === expected.cjs['not-direct-obj'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(js['not-direct-obj']),
        Object.getPrototypeOf(expected.cjs['not-direct-obj'])
      );
      assert.ok(js['not-direct-obj-mjs'].toString()
        === expected.cjs['not-direct-obj'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(js['not-direct-obj-mjs']),
        Object.getPrototypeOf(expected.cjs['not-direct-obj'])
      );

      // can't compare direct
      assert.ok(js['obj-class'].toString()
        === expected.cjs['obj-class'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(js['obj-class']),
        Object.getPrototypeOf(expected.cjs['obj-class'])
      );
      assert.ok(js['obj-class-mjs'].toString()
        === expected.cjs['obj-class'].toString());
      assert.deepStrictEqual(
        Object.getPrototypeOf(js['obj-class-mjs']),
        Object.getPrototypeOf(expected.cjs['obj-class'])
      );

      // can't compare symbols
      assert.ok(js.symbol.toString()
        === expected.cjs.symbol.toString());
      assert.ok(Object.getPrototypeOf(js.symbol)
        === Object.getPrototypeOf(expected.cjs.symbol));
      assert.ok(js['symbol-mjs'].toString()
        === expected.cjs.symbol.toString());
      assert.ok(Object.getPrototypeOf(js['symbol-mjs'])
        === Object.getPrototypeOf(expected.cjs.symbol));

      // reference different, the function name initially is id, but mapped to function
      // so only here we compare just function body;
      assert.ok(no_context.function.toString() === expected.cjs.function.toString());
    });

    it('json', () => {
      const json = loaded.json = loader.module(folders.json);
      assert.deepStrictEqual(json.array, [1, 23, true, false, { name: "a" },
        [1, 3, 4, 5, { some: "maybe" }]]);
      assert.deepStrictEqual(json.bool, true);
      assert.deepStrictEqual(json.number, 1213123.851209381);
      assert.deepStrictEqual(json.obj, {
        name: "string",
        data: { data: { array: [42, 43] }, smth: "a" },
        field: true,
        array: ["true", false, 33.33]
      });
      assert.deepStrictEqual(json.string, "an arbitrary string nothing wrong with it");
      assert.throws(() => loader.module(folders.jsonEmpty))
    });

    it.skip('index', () => { });
  });
});