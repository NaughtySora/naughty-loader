interface NpmOptions {
  omit?: string[];
  rename?: Record<string, string>;
}

type ArrayLike = { length: number, includes(item: any): boolean };

interface LoadOptions {
  context?: any;
  loadOnly?: ArrayLike;
}

interface FileOptions {
  context?: any;
  loadOnly?: boolean;
}

interface DirOptions {
  shared?: LoadOptions;
  options?: Record<string, LoadOptions>;
}

type Npm = (path: string, options?: NpmOptions) => Readonly<Record<string, Readonly<any>>>;
type Node = (modules: string[]) => Readonly<Record<string, any>>;
type Module = (path: string, context?: LoadOptions) => Readonly<Record<string, any>>;
type Dir = (path: string, context?: DirOptions) => Readonly<Record<string, Readonly<any>>>;
type NoDI = () => any;
type Root = (path: string, context?: FileOptions) => any;
type File = (path: string, context?: FileOptions) => any;

export const npm: Npm;
export const node: Node;
export const module: Module;
export const dir: Dir;
export const noDI: NoDI;
export const root: Root;
export const file: File;
