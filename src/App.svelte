<script>
  import { getDashboard, getEnvironments, getGroups, getServices, getConfigError } from './dashboard-config.js';

  let selectedEnvironment = $state('all');
  let selectedGroup = $state('all');
  let searchQuery = $state('');
  let searchShortcutHint = $state('Ctrl+K');
  let searchInput = null;
  let sidebarOpen = $state(true);
  let copiedUrl = $state(null);
  let copyTimeout = null;

  const dashboard = getDashboard();
  const environments = getEnvironments();
  const groups = getGroups();
  const services = getServices();
  const configError = getConfigError();

  if (!dashboard || !environments || !groups || !services) {
    throw new Error('Configuration not initialized. Check dashboard-config.js setup.');
  }

  const environmentList = environments.list();
  const groupList = groups.list();
  const environmentMap = new Map(environmentList.map((e) => [e.id, e]));
  const groupMap = new Map(groupList.map((g) => [g.id, g]));
  // Deduplicate groups by ID (same group can exist across multiple environments)
  const uniqueGroupList = [...groupMap.values()];
  const allServices = services.list();
  const allServicesCount = allServices.length;

  const environmentCounts = environmentList.reduce((acc, env) => {
    acc[env.id] = allServices.filter((s) => s.environment?.id === env.id).length;
    return acc;
  }, {});

  let searchQueryNormalized = $derived(searchQuery.trim().toLowerCase());

  let servicesByEnvironment = $derived(
    selectedEnvironment === 'all'
      ? allServices
      : allServices.filter((s) => s.environment?.id === selectedEnvironment)
  );

  let visibleServicesCount = $derived(servicesByEnvironment.length);

  let groupCounts = $derived(
    uniqueGroupList.reduce((acc, group) => {
      acc[group.id] = servicesByEnvironment.filter((s) => s.group === group.id).length;
      return acc;
    }, {})
  );

  let filteredServices = $derived(
    servicesByEnvironment.filter((service) => {
      const matchesGroup = selectedGroup === 'all' || service.group === selectedGroup;
      if (!searchQueryNormalized) return matchesGroup;
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
      return matchesGroup && haystack.includes(searchQueryNormalized);
    })
  );

  let groupedServices = $derived(
    selectedGroup === 'all'
      ? uniqueGroupList
          .map((group) => ({
            ...group,
            services: filteredServices.filter((s) => s.group === group.id),
          }))
          .filter((g) => g.services.length > 0)
      : [
          {
            ...(groupMap.get(selectedGroup) || {
              id: selectedGroup,
              name: selectedGroup,
              icon: '📁',
              domain: '',
              color: '#3b82f6',
            }),
            services: filteredServices,
          },
        ].filter((g) => g.services.length > 0)
  );

  let hasActiveFilters = $derived(
    selectedEnvironment !== 'all' || selectedGroup !== 'all' || !!searchQueryNormalized
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

  function clearAllFilters() {
    selectedEnvironment = 'all';
    selectedGroup = 'all';
    searchQuery = '';
  }

  function copyUrl(event, url) {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(url);
    copiedUrl = url;
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copiedUrl = null;
    }, 1500);
  }

  function handleShortcut(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    }
    if (event.key === 'Escape') {
      if (document.activeElement === searchInput && searchQuery) {
        searchQuery = '';
        searchInput.blur();
      } else if (hasActiveFilters) {
        clearAllFilters();
      }
    }
  }

  $effect(() => {
    const listener = (e) => handleShortcut(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });

  $effect(() => {
    const isApple = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
    searchShortcutHint = isApple ? '⌘K' : 'Ctrl+K';
  });
</script>

<div class="app">
  {#if configError}
    <div class="error-banner">
      <svg class="error-svg" viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 110 2 1 1 0 010-2z"/>
      </svg>
      <span>Config error: {configError} — using fallback</span>
    </div>
  {/if}

  <header class="app-bar">
    <div class="app-bar-brand">
      <h1>{dashboard.title}</h1>
      {#if dashboard.badge}
        <span class="badge">{dashboard.badge}</span>
      {/if}
    </div>

    <nav class="env-tabs">
      <button
        class="env-tab"
        class:active={selectedEnvironment === 'all'}
        onclick={() => setEnvironmentFilter('all')}
        aria-pressed={selectedEnvironment === 'all'}
      >
        All <span class="env-count">{allServicesCount}</span>
      </button>
      {#each environmentList as env}
        <button
          class="env-tab"
          class:active={selectedEnvironment === env.id}
          onclick={() => setEnvironmentFilter(env.id)}
          aria-pressed={selectedEnvironment === env.id}
        >
          {env.name} <span class="env-count">{environmentCounts[env.id] || 0}</span>
        </button>
      {/each}
    </nav>

    <div class="search-box">
      <svg class="search-svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
        <circle cx="7" cy="7" r="5"/>
        <path d="M10.5 10.5L14 14" stroke-linecap="round"/>
      </svg>
      <input
        bind:this={searchInput}
        type="search"
        placeholder="Search services..."
        aria-label="Search services"
        bind:value={searchQuery}
      />
      <kbd>{searchShortcutHint}</kbd>
    </div>
  </header>

  <div class="toolbar">
    <div class="toolbar-left">
      <button
        class="toolbar-btn sidebar-btn"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
          {#if sidebarOpen}
            <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 13.5v-11zM2.5 2a.5.5 0 00-.5.5v11a.5.5 0 00.5.5H6V2H2.5zM7 2v12h6.5a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5H7z"/>
          {:else}
            <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 13.5v-11zM2.5 2a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-11z"/>
          {/if}
        </svg>
      </button>
      <span class="result-text">
        <strong>{filteredServices.length}</strong>
        <span class="result-sep">/</span>
        {allServicesCount} services
      </span>
      {#if hasActiveFilters}
        <button class="toolbar-btn clear-btn" onclick={clearAllFilters} title="Clear all filters (Esc)">
          <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
          Clear filters
        </button>
      {/if}
    </div>
    <div class="toolbar-right">
      <span class="toolbar-hint">
        <kbd>Esc</kbd> clear
      </span>
    </div>
  </div>

  <div class="workspace">
    <aside class="sidebar" class:collapsed={!sidebarOpen}>
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <span class="sidebar-label">{dashboard.groupLabel || 'Groups'}</span>
        </div>
        <nav class="group-list">
          <button
            class="group-item"
            class:active={selectedGroup === 'all'}
            onclick={() => setGroupFilter('all')}
            aria-pressed={selectedGroup === 'all'}
          >
            <span class="group-dot" style="background: var(--accent)"></span>
            <span class="group-item-name">All</span>
            <span class="group-item-count">{visibleServicesCount}</span>
          </button>
          {#each uniqueGroupList as group}
            <button
              class="group-item"
              class:active={selectedGroup === group.id}
              onclick={() => setGroupFilter(group.id)}
              aria-pressed={selectedGroup === group.id}
              style="--group-color: {group.color}"
            >
              <span class="group-dot" style="background: {group.color}"></span>
              <span class="group-item-icon">{group.icon}</span>
              <span class="group-item-name">{group.name}</span>
              <span class="group-item-count">{groupCounts[group.id] || 0}</span>
            </button>
          {/each}
        </nav>
      </div>
    </aside>

    <section class="content">
      {#each groupedServices as group (group.id)}
        <div class="group-section">
          {#if selectedGroup === 'all'}
            <div class="group-divider" style="--group-color: {group.color}">
              <span class="group-divider-accent" style="background: {group.color}"></span>
              <span class="group-divider-icon">{group.icon}</span>
              <span class="group-divider-name">{group.name}</span>
              {#if group.domain}
                <span class="group-divider-domain">{group.domain}</span>
              {/if}
              <span class="group-divider-count">{group.services.length}</span>
              <span class="group-divider-line"></span>
            </div>
          {/if}
          <div class="services-grid">
            {#each group.services as service (service.url)}
              <div
                class="service-card"
                style="--group-color: {groupMap.get(service.group)?.color || '#3b82f6'}"
              >
                <a
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="card-link"
                >
                  <span class="card-icon">{service.icon}</span>
                  <div class="card-body">
                    <div class="card-title">{service.name}</div>
                    {#if service.description}
                      <div class="card-desc">{service.description}</div>
                    {/if}
                    <div class="card-meta">
                      <span class="card-group-badge" style="--group-color: {groupMap.get(service.group)?.color || '#3b82f6'}">
                        <span class="card-group-dot" style="background: {groupMap.get(service.group)?.color || '#3b82f6'}"></span>
                        {getGroupName(service.group)}
                      </span>
                      <span class="card-url">{service.url.replace(/^https?:\/\//, '')}</span>
                    </div>
                  </div>
                </a>
                <button
                  class="card-copy"
                  class:copied={copiedUrl === service.url}
                  onclick={(e) => copyUrl(e, service.url)}
                  title="Copy URL"
                  aria-label="Copy URL to clipboard"
                >
                  {#if copiedUrl === service.url}
                    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                    </svg>
                  {:else}
                    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
                      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
                      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
                    </svg>
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="empty-title">No services found</p>
          <p class="empty-desc">Try adjusting your filters or search query</p>
          {#if hasActiveFilters}
            <button class="empty-clear" onclick={clearAllFilters}>Clear all filters</button>
          {/if}
        </div>
      {/each}
    </section>
  </div>

  <footer class="status-bar">
    <span>{dashboard.footer}</span>
  </footer>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :global(html) {
    height: 100%;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    background: var(--bg);
    color: var(--text);
    --bg: #f0f2f5;
    --surface: #ffffff;
    --surface-alt: #f8f9fb;
    --surface-hover: #f1f5f9;
    --border: #e2e8f0;
    --border-strong: #cbd5e1;
    --text: #1e293b;
    --text-muted: #64748b;
    --text-faint: #94a3b8;
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --accent-subtle: rgba(59, 130, 246, 0.08);
    --danger: #ef4444;
    --danger-bg: #fef2f2;
    --danger-border: #fecaca;
    --radius: 4px;
    --transition: 0.15s ease;
  }

  :global(#app) {
    height: 100%;
  }

  /* ── App Shell ── */

  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  /* ── Error Banner ── */

  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    background: var(--danger-bg);
    border-bottom: 1px solid var(--danger-border);
    color: var(--danger);
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .error-svg {
    flex-shrink: 0;
  }

  /* ── App Bar ── */

  .app-bar {
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    height: 48px;
    flex-shrink: 0;
  }

  .app-bar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .app-bar-brand h1 {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
    white-space: nowrap;
    color: var(--text);
  }

  .badge {
    font-size: 0.58rem;
    padding: 2px 7px;
    background: var(--accent-subtle);
    color: var(--accent);
    border-radius: var(--radius);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  /* ── Environment Tabs ── */

  .env-tabs {
    display: flex;
    align-items: center;
    background: var(--surface-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    flex-shrink: 0;
  }

  .env-tab {
    padding: 5px 14px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.72rem;
    transition: all var(--transition);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .env-tab + .env-tab {
    border-left: 1px solid var(--border);
  }

  .env-tab.active {
    background: var(--accent);
    color: white;
  }

  .env-tab:hover:not(.active) {
    background: var(--accent-subtle);
    color: var(--text);
  }

  .env-count {
    opacity: 0.7;
    font-size: 0.65rem;
  }

  /* ── Search ── */

  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 5px 10px;
    margin-left: auto;
    min-width: 200px;
    max-width: 340px;
    flex: 1;
    transition: border-color var(--transition), box-shadow var(--transition);
  }

  .search-box:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-subtle);
  }

  .search-svg {
    flex-shrink: 0;
    color: var(--text-faint);
  }

  .search-box input {
    border: none;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 0.8rem;
    outline: none;
    flex: 1;
    min-width: 0;
  }

  .search-box input::placeholder {
    color: var(--text-faint);
  }

  /* Remove native search clear button */
  .search-box input[type='search']::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  .search-box kbd {
    font-family: inherit;
    font-size: 0.58rem;
    padding: 2px 5px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text-faint);
    box-shadow: 0 1px 0 var(--border);
    flex-shrink: 0;
    line-height: 1;
  }

  /* ── Toolbar ── */

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 32px;
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.72rem;
    border-radius: var(--radius);
    transition: all var(--transition);
  }

  .toolbar-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .clear-btn {
    color: var(--accent);
  }

  .clear-btn:hover {
    background: var(--accent-subtle);
    color: var(--accent-hover);
  }

  .result-text {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .result-text strong {
    color: var(--text);
  }

  .result-sep {
    color: var(--text-faint);
    margin: 0 1px;
  }

  .toolbar-hint {
    color: var(--text-faint);
    font-size: 0.62rem;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-hint kbd {
    font-family: inherit;
    font-size: 0.58rem;
    padding: 1px 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 2px;
    color: var(--text-faint);
    line-height: 1;
  }

  /* ── Workspace ── */

  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* ── Sidebar ── */

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    overflow-x: hidden;
    transition: width var(--transition);
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .sidebar.collapsed {
    width: 0;
    border-right-color: transparent;
  }

  .sidebar-inner {
    width: 220px;
    padding: 8px 0;
  }

  .sidebar-header {
    padding: 8px 14px 6px;
  }

  .sidebar-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-faint);
    font-weight: 600;
  }

  .group-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .group-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.78rem;
    text-align: left;
    width: 100%;
    border-left: 2px solid transparent;
    transition: all var(--transition);
  }

  .group-item:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .group-item.active {
    background: var(--accent-subtle);
    color: var(--accent);
    border-left-color: var(--group-color, var(--accent));
    font-weight: 600;
  }

  .group-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .group-item-icon {
    font-size: 0.9rem;
    flex-shrink: 0;
    line-height: 1;
  }

  .group-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .group-item-count {
    margin-left: auto;
    font-size: 0.62rem;
    color: var(--text-faint);
    flex-shrink: 0;
    font-weight: 500;
  }

  /* ── Content ── */

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  /* ── Group Sections ── */

  .group-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .group-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    color: var(--text-muted);
    padding: 0 2px;
  }

  .group-divider-accent {
    width: 3px;
    height: 14px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .group-divider-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .group-divider-name {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text);
    font-size: 0.72rem;
  }

  .group-divider-domain {
    color: var(--text-faint);
    font-size: 0.68rem;
  }

  .group-divider-count {
    font-size: 0.62rem;
    padding: 1px 7px;
    background: var(--surface-hover);
    border-radius: 10px;
    color: var(--text-faint);
    font-weight: 500;
  }

  .group-divider-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Services Grid ── */

  .services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 8px;
  }

  /* ── Service Card ── */

  .service-card {
    position: relative;
    display: flex;
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--group-color, #3b82f6);
    border-radius: var(--radius);
    transition: border-color var(--transition), box-shadow var(--transition);
    overflow: hidden;
  }

  .service-card:hover {
    border-color: var(--border-strong);
    border-left-color: var(--group-color, #3b82f6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .card-link {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    text-decoration: none;
    color: inherit;
    flex: 1;
    min-width: 0;
  }

  /* Make the link cover the entire card for click area */
  .card-link::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  .card-icon {
    font-size: 1.3rem;
    flex-shrink: 0;
    line-height: 1;
    padding-top: 1px;
  }

  .card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
  }

  .card-desc {
    font-size: 0.7rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.65rem;
    color: var(--text-faint);
    margin-top: 2px;
  }

  .card-group-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--group-color, #3b82f6);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.6rem;
    flex-shrink: 0;
  }

  .card-group-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .card-url {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-copy {
    position: absolute;
    top: 7px;
    right: 7px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: var(--radius);
    color: var(--text-muted);
    cursor: pointer;
    opacity: 0;
    transition: all var(--transition);
    padding: 0;
  }

  .service-card:hover .card-copy {
    opacity: 1;
  }

  .card-copy:hover {
    background: var(--accent-subtle);
    border-color: var(--accent);
    color: var(--accent);
  }

  .card-copy.copied {
    opacity: 1;
    color: #22c55e;
    border-color: #22c55e;
    background: rgba(34, 197, 94, 0.08);
  }

  /* ── Empty State ── */

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 64px 16px;
    color: var(--text-faint);
  }

  .empty-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-muted);
    margin: 8px 0 0;
  }

  .empty-desc {
    font-size: 0.78rem;
    margin: 0;
  }

  .empty-clear {
    margin-top: 8px;
    padding: 6px 16px;
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
    border-radius: var(--radius);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.75rem;
    transition: all var(--transition);
  }

  .empty-clear:hover {
    background: var(--accent);
    color: white;
  }

  /* ── Status Bar ── */

  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    height: 24px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    font-size: 0.62rem;
    color: var(--text-faint);
    flex-shrink: 0;
  }

  /* ── Scrollbar Styling (Webkit) ── */

  .sidebar::-webkit-scrollbar,
  .content::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar::-webkit-scrollbar-track,
  .content::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar::-webkit-scrollbar-thumb,
  .content::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }

  .sidebar::-webkit-scrollbar-thumb:hover,
  .content::-webkit-scrollbar-thumb:hover {
    background: var(--border-strong);
  }

  /* ── Responsive ── */

  @media (max-width: 768px) {
    .app-bar {
      flex-wrap: wrap;
      height: auto;
      padding: 8px 12px;
      gap: 8px;
    }

    .env-tabs {
      order: 3;
      overflow-x: auto;
      scrollbar-width: none;
      width: 100%;
    }

    .env-tabs::-webkit-scrollbar {
      display: none;
    }

    .search-box {
      order: 2;
      max-width: none;
      min-width: 0;
    }

    .sidebar {
      display: none;
    }

    .services-grid {
      grid-template-columns: 1fr;
    }

    .toolbar-hint {
      display: none;
    }

    .content {
      padding: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .service-card,
    .group-item,
    .env-tab,
    .sidebar,
    .card-copy {
      transition: none;
    }
  }
</style>
