import { DashboardConfig } from './dashboard.js';
import { Environments } from './environments.js';
import { Groups } from './groups.js';
import { Services } from './services.js';

/**
 * Validates the loaded config object structure
 * @param {Object} config - The loaded configuration
 * @throws {Error} If config is missing required fields
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be a valid object');
  }

  // Validate dashboard
  if (!config.dashboard) {
    throw new Error('Config must have a "dashboard" object');
  }
  const requiredDashboardFields = ['title', 'subtitle', 'badge', 'footer', 'groupLabel'];
  for (const field of requiredDashboardFields) {
    if (typeof config.dashboard[field] !== 'string') {
      throw new Error(`dashboard.${field} must be a string`);
    }
  }

  // Validate environments
  if (!Array.isArray(config.environments)) {
    throw new Error('Config must have an "environments" array');
  }
  if (config.environments.length === 0) {
    throw new Error('At least one environment is required');
  }
  for (const env of config.environments) {
    if (typeof env.id !== 'string' || typeof env.name !== 'string') {
      throw new Error('Each environment must have "id" and "name" strings');
    }
  }

  // Validate groups
  if (!Array.isArray(config.groups)) {
    throw new Error('Config must have a "groups" array');
  }
  for (const group of config.groups) {
    const requiredGroupFields = ['id', 'name', 'domain', 'color', 'icon', 'environment'];
    for (const field of requiredGroupFields) {
      if (typeof group[field] !== 'string') {
        throw new Error(`Each group must have a "${field}" string`);
      }
    }
    // Validate that referenced environment exists
    const envExists = config.environments.some((env) => env.id === group.environment);
    if (!envExists) {
      throw new Error(`Group "${group.id}" references non-existent environment "${group.environment}"`);
    }
  }

  // Validate services
  if (!Array.isArray(config.services)) {
    throw new Error('Config must have a "services" array');
  }
  for (const service of config.services) {
    const requiredServiceFields = ['name', 'url', 'description', 'icon', 'group', 'environment'];
    for (const field of requiredServiceFields) {
      if (typeof service[field] !== 'string') {
        throw new Error(`Each service must have a "${field}" string`);
      }
    }
    // Validate that referenced environment exists
    const envExists = config.environments.some((env) => env.id === service.environment);
    if (!envExists) {
      throw new Error(`Service "${service.name}" references non-existent environment "${service.environment}"`);
    }
    // Validate that referenced group exists
    const groupExists = config.groups.some((group) => group.id === service.group);
    if (!groupExists) {
      throw new Error(`Service "${service.name}" references non-existent group "${service.group}"`);
    }
  }
}

/**
 * Constructs config objects from validated JSON
 * @param {Object} config - The validated configuration
 * @returns {Object} Object containing dashboard, environments, groups, services
 */
function buildConfigObjects(config) {
  // Build dashboard
  const dashboard = new DashboardConfig()
    .setTitle(config.dashboard.title)
    .setSubtitle(config.dashboard.subtitle)
    .setBadge(config.dashboard.badge)
    .setFooter(config.dashboard.footer)
    .setGroupLabel(config.dashboard.groupLabel);

  // Build environments map
  const environments = new Environments();
  const environmentMap = {};
  for (const env of config.environments) {
    const createdEnv = environments.addEnvironment(env.id, env.name);
    environmentMap[env.id] = createdEnv;
  }

  // Build groups
  const groupsMap = {};
  for (const groupConfig of config.groups) {
    const env = environmentMap[groupConfig.environment];
    const groups = groupsMap[groupConfig.environment] || new Groups(env);
    groups.addGroup(groupConfig.id, groupConfig.name, groupConfig.domain, groupConfig.color, groupConfig.icon);
    groupsMap[groupConfig.environment] = groups;
  }

  // Create aggregated groups object
  const groups = {
    list() {
      return Object.values(groupsMap).flatMap((g) => g.list());
    },
  };

  // Build services
  const servicesMap = {};
  for (const serviceConfig of config.services) {
    const env = environmentMap[serviceConfig.environment];
    const services = servicesMap[serviceConfig.environment] || new Services(env);
    services.addService(
      serviceConfig.name,
      serviceConfig.url,
      serviceConfig.description,
      serviceConfig.icon,
      serviceConfig.group
    );
    servicesMap[serviceConfig.environment] = services;
  }

  // Create aggregated services object
  const services = {
    list() {
      return Object.values(servicesMap).flatMap((s) => s.list());
    },
  };

  return { dashboard, environments, groups, services };
}

/**
 * Loads and constructs config from JSON
 * @param {Object} configJson - The JSON configuration object
 * @returns {Object} Object containing dashboard, environments, groups, services
 * @throws {Error} If config is invalid
 */
export function loadConfig(configJson) {
  validateConfig(configJson);
  return buildConfigObjects(configJson);
}

/**
 * Attempts to load config from a URL path
 * Useful for loading from mounted volumes in Docker
 * @param {string} path - The path to the config file (e.g., '/config.json')
 * @returns {Promise<Object>} Promise resolving to config objects
 */
export async function loadConfigFromPath(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch config from ${path}: ${response.statusText}`);
    }
    const configJson = await response.json();
    return loadConfig(configJson);
  } catch (error) {
    throw new Error(`Error loading config from ${path}: ${error.message}`);
  }
}
