<script>
  import { getDashboard, getEnvironments, getGroups, getServices, getConfigError } from './dashboard-config.js';

  let selectedEnvironment = $state('all');
  let selectedGroup = $state('all');
  let searchQuery = $state('');
  let searchShortcutHint = $state('Ctrl+K');
  let searchInput = null;

  // Get config from dashboard-config (initialized by main.js)
  const dashboard = getDashboard();
  const environments = getEnvironments();
  const groups = getGroups();
  const services = getServices();
  const configError = getConfigError();

  // Handle case where config might not be loaded yet
  if (!dashboard || !environments || !groups || !services) {
    throw new Error('Configuration not initialized. Check dashboard-config.js setup.');
  }

  const environmentList = environments.list();
  const groupList = groups.list();
  const environmentMap = new Map(
    environmentList.map((environment) => [environment.id, environment])
  );
  const groupMap = new Map(groupList.map((group) => [group.id, group]));
  const allServices = services.list();
  const allServicesCount = allServices.length;

  const environmentCounts = environmentList.reduce((acc, environment) => {
    acc[environment.id] = allServices.filter(
      (service) => service.environment?.id === environment.id
    ).length;
    return acc;
  }, {});

  let searchQueryNormalized = $derived(searchQuery.trim().toLowerCase());
  let servicesByEnvironment = $derived(
    selectedEnvironment === 'all'
      ? allServices
      : allServices.filter((service) => service.environment?.id === selectedEnvironment)
  );
  let visibleServicesCount = $derived(servicesByEnvironment.length);
  let groupCounts = $derived(
    groupList.reduce((acc, group) => {
      acc[group.id] = servicesByEnvironment.filter((service) => service.group === group.id).length;
      return acc;
    }, {})
  );
  let filteredServices = $derived(
    servicesByEnvironment.filter((service) => {
      const matchesEnvironment =
        selectedEnvironment === 'all' || service.environment?.id === selectedEnvironment;
      const matchesGroup = selectedGroup === 'all' || service.group === selectedGroup;
      if (!searchQueryNormalized) {
        return matchesEnvironment && matchesGroup;
      }
      const haystack = [
        service.name,
        service.description,
        service.url,
        getGroupName(service.group),
        service.environment?.name,
        service.environment?.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesEnvironment && matchesGroup && haystack.includes(searchQueryNormalized);
    })
  );

  $effect(() => {
    if (selectedGroup !== 'all' && !groupMap.has(selectedGroup)) {
      selectedGroup = 'all';
    }
  });

  $effect(() => {
    if (selectedEnvironment !== 'all' && !environmentMap.has(selectedEnvironment)) {
      selectedEnvironment = 'all';
    }
  });

  function setGroupFilter(groupId) {
    selectedGroup = selectedGroup === groupId ? 'all' : groupId;
  }

  function setEnvironmentFilter(environmentId) {
    selectedEnvironment = selectedEnvironment === environmentId ? 'all' : environmentId;
  }

  function getGroupName(groupId) {
    return groupMap.get(groupId)?.name || groupId;
  }

  function handleShortcut(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  }

  $effect(() => {
    const listener = (event) => handleShortcut(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });

  $effect(() => {
    const isApplePlatform = /mac|iphone|ipad|ipod/i.test(
      navigator.platform || navigator.userAgent
    );
    searchShortcutHint = isApplePlatform ? '⌘K' : 'Ctrl+K';
  });
</script>

<main class="dashboard">
  {#if configError}
    <div class="error-banner">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <div class="error-text">
          <div class="error-title">Configuration Error</div>
          <div class="error-message">{configError}</div>
          <div class="error-note">Using fallback configuration</div>
        </div>
      </div>
    </div>
  {/if}

  <header class="hero">
    <h1>{dashboard.title}</h1>
    <p class="subtitle">{dashboard.subtitle}</p>
    <div class="hero-badge">{dashboard.badge}</div>
  </header>

  <div class="sticky-header">
    <div class="top-filters">
      <div class="filter-block">
        <span class="filter-label">Environment</span>
        <div class="chip-row">
          <button
            class="chip {selectedEnvironment === 'all' ? 'active' : ''}"
            onclick={() => setEnvironmentFilter('all')}
            title="Show all environments"
            aria-pressed={selectedEnvironment === 'all'}
          >
            All ({allServicesCount})
          </button>
          {#each environmentList as environment}
            <button
              class="chip {selectedEnvironment === environment.id ? 'active' : ''}"
              onclick={() => setEnvironmentFilter(environment.id)}
              title="Filter to show only {environment.name} services"
              aria-pressed={selectedEnvironment === environment.id}
            >
              {environment.name} ({environmentCounts[environment.id] || 0})
            </button>
          {/each}
        </div>
      </div>

      <div class="filter-block search-block">
        <span class="filter-label">Search</span>
        <div class="search-input">
          <input
            bind:this={searchInput}
            type="search"
            placeholder="Search services"
            aria-label="Search services"
            bind:value={searchQuery}
          />
          <span class="search-hint">{searchShortcutHint}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="content-layout">
    <aside class="group-sidebar">
      <div class="filter-block stacked">
        <span class="filter-label">{dashboard.groupLabel || 'Group'}</span>
        <div class="group-filters">
          <button
            class="group-card all {selectedGroup === 'all' ? 'active' : ''}"
            onclick={() => setGroupFilter('all')}
            title="Show all services"
            aria-pressed={selectedGroup === 'all'}
          >
            <div class="group-icon">🌐</div>
            <div class="group-name">All</div>
            <div class="group-domain">{visibleServicesCount} service(s)</div>
          </button>

          {#each groupList as group}
            <button
              class="group-card {selectedGroup === group.id ? 'active' : ''}"
              onclick={() => setGroupFilter(group.id)}
              title="Filter to show only {group.name} services"
              style={`--cluster-color: ${group.color}`}
              aria-pressed={selectedGroup === group.id}
            >
              <div class="group-icon">{group.icon}</div>
              <div class="group-name">{group.name}</div>
              <div class="group-domain">{group.domain}</div>
              <div class="group-service-count">{groupCounts[group.id] || 0} service(s)</div>
            </button>
          {/each}
        </div>
      </div>
    </aside>

    <section class="content-panel">
      <div class="results-summary">
        <p>
          Showing <strong>{filteredServices.length}</strong> of <strong>{allServicesCount}</strong>
          services
        </p>
        {#if selectedEnvironment !== 'all' || selectedGroup !== 'all' || searchQueryNormalized}
          <button
            class="clear-filters"
            onclick={() => {
              selectedEnvironment = 'all';
              selectedGroup = 'all';
              searchQuery = '';
            }}
            title="Clear all filters"
          >
            Clear filters
          </button>
        {/if}
      </div>

      <div class="services-grid">
        {#each filteredServices as service (service.url)}
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            class="service-card"
            title={service.description}
            style={`--cluster-color: ${groupMap.get(service.group)?.color || '#3498db'}`}
          >
            <div class="service-icon">{service.icon}</div>
            <div class="service-name">{service.name}</div>
            <div class="service-cluster">{getGroupName(service.group)}</div>
            <div class="service-url">{service.url}</div>
          </a>
        {:else}
          <div class="empty-state">
            <h2>No services match these filters.</h2>
            <p>Try adjusting environment/group filters or clearing your search query.</p>
          </div>
        {/each}
      </div>
    </section>
  </div>

  <footer class="footer">
    <p>{dashboard.footer}</p>
  </footer>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    background-color: #f3f6f4;
    color: #17211e;
    min-height: 100vh;
    background-image:
      radial-gradient(circle at 20% 20%, rgba(31, 138, 112, 0.12), transparent 55%),
      radial-gradient(circle at 80% 0%, rgba(244, 185, 66, 0.18), transparent 50%),
      linear-gradient(180deg, #f7f5ef 0%, #f1f6f4 100%);
    --panel: #ffffff;
    --panel-strong: #f7faf8;
    --panel-muted: #f1f5f3;
    --ink: #17211e;
    --muted: #536260;
    --accent: #1f8a70;
    --accent-strong: #176e59;
    --line: rgba(23, 33, 30, 0.12);
    --line-strong: rgba(23, 33, 30, 0.2);
    --shadow: 0 18px 40px rgba(23, 33, 30, 0.08);
    --shadow-soft: 0 10px 22px rgba(23, 33, 30, 0.06);
  }

  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0;
    padding: 1rem;
    margin-bottom: 0.5rem;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
  }

  .error-content {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .error-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .error-text {
    flex: 1;
  }

  .error-title {
    font-weight: 700;
    color: #dc2626;
    margin-bottom: 0.25rem;
    font-size: 0.95rem;
  }

  .error-message {
    font-size: 0.85rem;
    color: #b91c1c;
    margin-bottom: 0.5rem;
    font-family: 'Courier New', monospace;
    word-break: break-word;
  }

  .error-note {
    font-size: 0.75rem;
    color: #991b1b;
    font-style: italic;
  }

  .hero {
    text-align: center;
    padding: 1.5rem 2rem 1rem;
    background: var(--panel);
    border-radius: 0;
    box-shadow: var(--shadow);
    border: 1px solid rgba(31, 138, 112, 0.15);
    position: relative;
    overflow: hidden;
  }

  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top left, rgba(31, 138, 112, 0.12), transparent 55%);
    pointer-events: none;
  }

  .hero-badge {
    position: absolute;
    top: 0.85rem;
    right: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    border-radius: 0;
    background: rgba(31, 138, 112, 0.12);
    color: var(--accent-strong);
    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  h1 {
    text-align: center;
    color: var(--ink);
    margin: 0 0 0.6rem;
    font-size: clamp(2.4rem, 3vw, 3.2rem);
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  }

  .subtitle {
    text-align: center;
    color: var(--muted);
    margin: 0;
    font-size: 1.05rem;
  }

  /* Filters */
  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 0.75rem 0;
    background: rgba(243, 246, 244, 0.94);
    backdrop-filter: blur(6px);
  }

  .top-filters {
    background: var(--panel);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-soft);
    padding: 0.85rem 1rem;
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(240px, 360px);
    gap: 0.8rem 1.25rem;
    align-items: center;
  }

  .content-layout {
    display: grid;
    grid-template-columns: minmax(290px, 330px) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .group-sidebar {
    background: var(--panel);
    border-radius: 0;
    box-shadow: var(--shadow-soft);
    border: 1px solid var(--line);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    position: sticky;
    top: 5.8rem;
  }

  .content-panel {
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .filter-block {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .search-block {
    justify-content: flex-end;
  }

  .filter-block.stacked {
    align-items: flex-start;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.9rem;
  }

  .filter-block.stacked:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .filter-label {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .search-input {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--line-strong);
    background: var(--panel-muted);
    padding: 0.35rem 0.75rem;
    flex: 1;
    min-width: 220px;
  }

  .search-input:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(31, 138, 112, 0.2);
  }

  .search-input input {
    border: none;
    background: transparent;
    color: var(--ink);
    font-family: inherit;
    font-size: 0.85rem;
    min-width: 200px;
    outline: none;
    flex: 1;
  }

  .search-input input::placeholder {
    color: rgba(83, 98, 96, 0.7);
  }

  .search-hint {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    border: 1px solid var(--line);
    background: var(--panel-muted);
    color: var(--ink);
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .chip:hover {
    background: #e7eeea;
    transform: translateY(-1px);
  }

  .chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .group-filters {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;
    align-items: stretch;
    width: 100%;
  }

  .group-card {
    padding: 0.9rem 1rem;
    border: 1px solid var(--line);
    background: var(--panel-strong);
    color: var(--muted);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    display: grid;
    gap: 0.25rem;
    text-align: left;
  }

  .group-card.all {
    --cluster-color: var(--accent);
  }

  .group-card:hover {
    background: #edf2f0;
    transform: translateY(-1px);
  }

  .group-card.active {
    background: var(--cluster-color, #3498db);
    color: white;
    border-color: var(--cluster-color, #3498db);
    box-shadow: 0 10px 20px rgba(23, 33, 30, 0.18);
  }

  .group-card.active:hover {
    background: color-mix(in srgb, var(--cluster-color, #3498db) 90%, black 10%);
  }

  .group-icon {
    font-size: 1.6rem;
    color: var(--cluster-color, var(--accent));
  }

  .group-card.active .group-icon {
    color: white;
  }

  .group-name {
    font-size: 1rem;
    font-weight: 600;
  }

  .group-domain {
    font-size: 0.78rem;
    color: var(--muted);
  }

  .group-card.active .group-domain {
    color: rgba(255, 255, 255, 0.8);
  }

  .group-service-count {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
  }

  .group-card.active .group-service-count {
    color: rgba(255, 255, 255, 0.85);
  }

  /* Services Grid */
  .services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .results-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1rem;
    border: 1px solid var(--line);
    background: var(--panel);
    box-shadow: var(--shadow-soft);
    font-size: 0.9rem;
  }

  .results-summary p {
    margin: 0;
    color: var(--muted);
  }

  .clear-filters {
    border: 1px solid var(--line-strong);
    background: var(--panel-muted);
    color: var(--ink);
    padding: 0.35rem 0.65rem;
    font-family: inherit;
    cursor: pointer;
  }

  .clear-filters:hover {
    background: #e7eeea;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    border: 1px dashed var(--line-strong);
    padding: 2rem 1rem;
    background: rgba(255, 255, 255, 0.7);
  }

  .empty-state h2 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
  }

  .empty-state p {
    margin: 0;
    color: var(--muted);
  }

  .service-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: var(--panel);
    border-radius: 0;
    box-shadow: var(--shadow-soft);
    text-decoration: none;
    color: var(--ink);
    transition: all 0.2s ease;
    border: 1px solid var(--line);
    min-height: 170px;
    position: relative;
  }

  .service-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow);
    border-color: var(--cluster-color, #3498db);
  }

  .service-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--cluster-color, #3498db);
    border-radius: 0;
  }

  .service-icon {
    font-size: 2.6rem;
    margin-bottom: 0.6rem;
  }

  .service-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.3rem;
    text-align: center;
  }

  .service-cluster {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--cluster-color, #3498db);
    background: color-mix(in srgb, var(--cluster-color, #3498db) 15%, white);
    padding: 0.2rem 0.6rem;
    border-radius: 0;
    margin-bottom: 0.5rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .service-url {
    font-size: 0.78rem;
    color: var(--muted);
    word-break: break-all;
    text-align: center;
    margin-top: 0.5rem;
  }

  .footer {
    text-align: center;
    padding: 1.5rem;
    color: var(--muted);
    font-size: 0.9rem;
    border-top: 1px solid var(--line);
  }

  @media (prefers-reduced-motion: reduce) {
    .service-card,
    .group-card,
    .chip {
      transition: none;
    }
  }

  @media (max-width: 1024px) {
    .top-filters {
      grid-template-columns: 1fr;
    }

    .search-block {
      justify-content: flex-start;
    }

    .content-layout {
      grid-template-columns: 1fr;
    }

    .group-sidebar {
      position: static;
    }

    .services-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .services-grid {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }

    .filter-block {
      align-items: flex-start;
    }

    .search-input {
      width: 100%;
    }

    .search-input input {
      min-width: 0;
      width: 100%;
    }

    .group-filters {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .sticky-header {
      position: static;
      padding: 0;
      background: transparent;
      backdrop-filter: none;
    }

    .results-summary {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .services-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
