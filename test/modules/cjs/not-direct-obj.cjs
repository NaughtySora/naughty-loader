'use strict';

const { EventEmitter } = require('node:events');

class B extends EventEmitter {
  constructor() {
    super();
  }

  test() {
    throw new Error("B - test");
  }
}

module.exports = new B();