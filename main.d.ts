interface NpmOptions {
  omit?: string[];
  rename?: Record<string, string>;
}

type Npm = (path: string, options?: NpmOptions) => Readonly<Record<string, Readonly<any>>>;
type Node = (modules: string[]) => Readonly<Record<string, Readonly<any>>>;
type Module = (path: string, context?: any) => Readonly<Record<string, Readonly<any>>> | Readonly<Function>;
type Dir = (path: string, context?: any) => Readonly<Record<string, Readonly<any>>>;

export const npm: Npm;
export const node: Node;
export const module: Module;
export const dir: Dir;
