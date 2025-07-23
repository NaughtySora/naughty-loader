import { EventEmitter } from 'node:events';

class B extends EventEmitter {
  constructor() {
    super();
  }

  test() {
    throw new Error("B - test");
  }
}

export default new B();