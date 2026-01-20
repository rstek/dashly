import { loadConfig } from './config-loader.js';

// Fallback config for local development when config.json is not available
const fallbackConfig = {
  dashboard: {
    title: 'Infrastructure Dashboard',
    subtitle: 'Quick access to services across clusters and environments.',
    badge: 'Services',
    footer: 'Service Dashboard | Built with Svelte',
    groupLabel: 'Group',
  },
  environments: [
    { id: 'dev', name: 'Development' },
  ],
  groups: [
    {
      id: 'demo',
      name: 'Demo',
      domain: 'demo.local',
      color: '#3498db',
      icon: '🧪',
      environment: 'dev',
    },
  ],
  services: [
    {
      name: 'Demo Service',
      url: 'https://example.com',
      description: 'Example service for demonstration',
      icon: '🔗',
      group: 'demo',
      environment: 'dev',
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
