export class DashboardConfig {
  constructor() {
    this.title = '';
    this.subtitle = '';
    this.badge = '';
    this.footer = '';
    this.groupLabel = '';
  }

  setTitle(title) {
    this.title = title;
    return this;
  }

  setSubtitle(subtitle) {
    this.subtitle = subtitle;
    return this;
  }

  setBadge(badge) {
    this.badge = badge;
    return this;
  }

  setFooter(footer) {
    this.footer = footer;
    return this;
  }

  setGroupLabel(groupLabel) {
    this.groupLabel = groupLabel;
    return this;
  }
}
