import { mount } from 'svelte';
import App from './App.svelte';
import { initializeConfig, setConfig } from './dashboard-config.js';

async function main() {
  try {
    const config = await initializeConfig();
    setConfig(config);
  } catch (error) {
    console.error('Failed to initialize config:', error);
  }

  const target = document.getElementById('app');
  mount(App, { target });

  // Append user-supplied stylesheet last so it wins the cascade over
  // Svelte's runtime-injected styles. Missing file 404s harmlessly.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/custom.css';
  document.head.appendChild(link);
}

main();

export default App;
