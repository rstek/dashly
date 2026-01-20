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
}

main();

export default App;
