'use strict';

class A {
  constructor(name){
    this.name = name;
    this.length = 0;
  }

  method1(){

  }

  #hidden(){

  }

  _internal(){

  }
}

module.exports = new A("name");
