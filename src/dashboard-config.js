import { loadConfig } from './config-loader.js';

// Fallback config shown when no config.json is mounted. Worded to make it
// obvious to a first-time visitor that what they're seeing is the built-in
// default and they need to provide their own config.json.
const fallbackConfig = {
  dashboard: {
    title: 'Dashly (default config)',
    subtitle:
      'No config.json detected — you are viewing the built-in demo. Mount your own config.json to replace this.',
    badge: 'Demo',
    footer: 'Dashly default config | Mount /config.json to customise',
    groupLabel: 'Group',
  },
  environments: [{ id: 'demo', name: 'Demo' }],
  groups: [
    {
      id: 'getting-started',
      name: 'Getting Started',
      domain: 'github.com/rstek/dashly',
      color: '#3498db',
      icon: '👋',
      environment: 'demo',
    },
  ],
  services: [
    {
      name: 'This is the default config',
      url: 'https://github.com/rstek/dashly#configuration',
      description:
        'You are looking at the fallback shown when no config.json is mounted. Click through for setup instructions.',
      icon: '📄',
      group: 'getting-started',
      environment: 'demo',
    },
    {
      name: 'Dashly on GitHub',
      url: 'https://github.com/rstek/dashly',
      description: 'Source, issues, and release notes.',
      icon: '🐙',
      group: 'getting-started',
      environment: 'demo',
    },
    {
      name: 'Configure your dashboard',
      url: 'https://github.com/rstek/dashly#configuration',
      description: 'JSON schema for dashboard, environments, groups, and services.',
      icon: '⚙️',
      group: 'getting-started',
      environment: 'demo',
    },
  ],
};

// State containers that will be populated by initializeConfig
let dashboard = null;
let environments = null;
let groups = null;
let services = null;
let configError = null;

/**
 * Loads dashboard configuration from config.json with fallback to hardcoded config
 * @returns {Promise<Object>} Promise resolving to config objects
 */
export async function initializeConfig() {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config.json: ${response.statusText}`);
    }
    const configJson = await response.json();
    try {
      return loadConfig(configJson);
    } catch (validationError) {
      configError = `Config validation error: ${validationError.message}`;
      console.warn(configError, 'Using fallback config');
      return loadConfig(fallbackConfig);
    }
  } catch (error) {
    configError = `Failed to load config.json: ${error.message}`;
    console.warn(configError, 'Using fallback config');
    return loadConfig(fallbackConfig);
  }
}

/**
 * Sets the loaded configuration (called by main.js after loading)
 * @param {Object} config - The loaded config objects
 */
export function setConfig(config) {
  dashboard = config.dashboard;
  environments = config.environments;
  groups = config.groups;
  services = config.services;
}

/**
 * Gets current dashboard config
 */
export function getDashboard() {
  return dashboard;
}

/**
 * Gets current environments
 */
export function getEnvironments() {
  return environments;
}

/**
 * Gets current groups
 */
export function getGroups() {
  return groups;
}

/**
 * Gets current services
 */
export function getServices() {
  return services;
}

/**
 * Gets any config loading/validation errors
 */
export function getConfigError() {
  return configError;
}
