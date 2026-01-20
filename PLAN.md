# JSON Config Plan

Goal: Move dashboard/environments/groups/services configuration into a JSON file that can be mounted into a Docker container, then parsed into the existing classes.

1. Define a minimal JSON structure for dashboard, environments, groups, and services; include a sample config file.
2. Implement a lightweight JSON loader that validates required fields and constructs `DashboardConfig`, `Environments`, `Groups`, and `Services`.
3. Wire the loader into the app, keeping a simple fallback config for local dev.
4. Document Docker usage: mounting the JSON and configuring its path.
