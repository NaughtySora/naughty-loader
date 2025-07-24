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