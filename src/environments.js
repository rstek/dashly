class Environment {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

export class Environments {
  constructor() {
    this.items = [];
  }

  addEnvironment(id, name) {
    const environment = new Environment(id, name);
    this.items.push(environment);
    return environment;
  }

  list() {
    return this.items;
  }

  get(id) {
    return this.items.find((environment) => environment.id === id);
  }
}
