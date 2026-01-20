export class Services {
  constructor(environment) {
    this.environment = environment;
    this.items = [];
  }

  addService(name, url, description, icon, group) {
    this.items.push({ name, url, description, icon, group, environment: this.environment });
    return this;
  }

  list() {
    return this.items;
  }
}
