export class Groups {
  constructor(environment) {
    this.environment = environment;
    this.items = [];
  }

  addGroup(id, name, domain, color, icon) {
    this.items.push({ id, name, domain, color, icon, environment: this.environment });
    return this;
  }

  list() {
    return this.items;
  }
}
