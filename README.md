# Nodejs Loader

## Formats 
- js
- mjs
- cjs
- json

## API

#### Npm packages

#### Node lib

#### Single files
- With dependency injection (by default)
- Without dependency injection

#### Module directory
*directory contains files that will be part of aggregated api*
- With dependency injection (by default)
- Without dependency injection

#### Directory
*directory with modules directories*
- With dependency injection (by default)
- Without dependency injection

#### Root file
*directory contains only index.(m|c)js will be 
unwrapped and become only thing that loader will return* 
- With dependency injection (by default)
- Without dependency injection

## Types

`interface NpmOptions {`\
  `omit?: string[];`\
  `rename?: Record<string, string>;`\
`}`

`type ArrayLike = { length: number, includes(item: any): boolean };`

`interface LoadOptions {`\
  `context?: any;`\
  `loadOnly?: ArrayLike;`\
`}`

`interface FileOptions {`\
  `context?: any;`\
  `loadOnly?: boolean;`\
`}`

`interface DirOptions {`\
  `shared?: LoadOptions;`\
  `options?: Record<string, LoadOptions>;`\
`}`

`type Npm = (path: string, options?: NpmOptions) => Readonly<Record<string, Readonly<any>>>;`
`type Node = (modules: string[]) => Readonly<Record<string, Readonly<any>>>;`
`type Module = (path: string, context?: LoadOptions) => Readonly<Record<string, any>>;`
`type Dir = (path: string, context?: DirOptions) => Readonly<Record<string, Readonly<any>>>;`
`type NoDI = () => any;`
`type Root = (path: string, context?: LoadOptions) => any;`
`type File = (path: string, context?: FileOptions) => any;`


## Examples

#### Node
```js
const libs = ['http', 'worker_threads', 'path', 'events'];

const node = loader.node(libs);
const PORT = 3000;
const server = node.http.createServer(() => {
  //...
});
server.listen(PORT);

const { EventEmitter } = node.events;
class A extends EventEmitter {
  constructor(){
    super();
  }

  method(){
    this.emit("method");
  }
}
const a = new A();
a.method();
```
#### Npm

```js
const packageJson = path.resolve('package.json');
const options = { // optional
  omit: ['ws', 'prisma'], 
  rename: { pg: 'postgres', 'naughty-util': 'util' },
};
const npm = loader.npm(packageJson, options);
const config = { pg: {},};
const pool = npm.postgres.Pool(config.pg);
await pool.connect();

const readFile = npm.util.async.promisify(fs.readFile);
const file = await readFile(__filename, "utf-8");
console.log(file);
```

#### Module
  ```js
  `file structure (tree)
    └── src/
        └── test/
            ├── method.js
            ├── di_module.mjs
            └── primitive.cjs
  `
  const options = {
    context: { 
      smth: {
        method(){
          console.log("Injected");
        }
      }
    },
    loadOnly: ["method"],
  };
  // path -> .../src/test
  const api = loader.module(path, options);

  /* if file exports a function, loader will call it injecting context, 
  use loadOnly: ['name'] to prevent it */
  // file content -> export default () => console.log("method");
  // output -> console.log("method")
  const output = api.method(); 

  // file content -> 
  `export default (context) => ({
    di_method(){
      return  context.smth.method();
    }
  });`
  // output -> console.log("Injected")
  const di = api.di_module.di_method();

  // file content -> module.exports = 'primitive';
  // value -> 'primitive';
  const primitive = api.primitive;
  ```

#### Dir
  ```js
  `file structure (tree)
    └── src/
        └── test/
            ├── method.js
            ├── di_module.mjs
            └── primitive.cjs
  `
  const dirOptions = {
    options: {
      test: { // specific folder
        context: { 
          smth: {
            method(){
              console.log("Injected");
            }
          }
        },
        loadOnly: ["method"],
      },
      shared: { // shared among all folders 
        context: { 
          smth: {
            method(){
              console.log("Injected");
            }
          }
        },
        loadOnly: ["method"],
      }
    },
  };
  /* here we load test folder, it leads us 
  to use loader.module to all sub folders in test folder */
  
  // path -> .../src
  const api = loader.dir(path, dirOptions);

  /* if file exports a function, loader will call it injecting context, 
  use loadOnly: ['name'] to prevent it */
  // file content -> export default () => console.log("method");
  // output -> console.log("method")
  const output = api.test.method();

  // test folder api reminds the same as above 
```
#### Root

```js
  `file structure (tree)
    └── src/
        └── test/
            ├── index.js
            └── folder
                └── file.json
  `
  const options = {
    context: { test: 42 },
    loadOnly: true,
  };
  /* it will ignore everting but index.(m|c)js file, first it will find*/
  // file context module.exports = () => console.log('test');
  // path -> .../src/test
  const api = loader.root(path, options);
  // since we have onlyLoad = true; it will result in console.log('test') output;
  api(); 
```

#### File
```js
  `file structure (tree)
    └── src/
        └── file.js
  `
  const options = {
    context: { test: 42 },
  };
  /* loads one file */
  // file context export default () => console.log('test');
  // path -> .../src/file.js
  const api = loader.file(path, options);
  // it exports a function and we don't use onlyLoad option here 
  // loader will call function and inject { test: 42 } context like a fn parameter
  console.log(api); // undefined
  api(); // error
```