# Critical Deployment Fixes Required

## Issue Summary
Your deployment is failing because:
1. The `.replit` file has incorrect port mappings
2. `node_modules` (9.6GB) is being included in the Docker image
3. The deployment image exceeds the 8 GiB limit

## REQUIRED FIX #1: Edit `.replit` File

Open `.replit` and make these changes:

### REMOVE these lines (14-23):
```toml
[[ports]]
localPort = 5000

[[ports]]
localPort = 38823
externalPort = 3000

[[ports]]
localPort = 44775
externalPort = 80
```

### REPLACE with:
```toml
[[ports]]
localPort = 5000
externalPort = 80
```

### ADD after line 7 (after packages):
```toml
[packager]
ignoredPaths = ["node_modules", ".git", "dist", "attached_assets", ".config"]
```

## Complete .replit File Should Look Like:

```toml
modules = ["nodejs-20", "web", "postgresql-16"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules", "dist"]

[nix]
channel = "stable-24_05"
packages = ["pandoc"]

[packager]
ignoredPaths = ["node_modules", ".git", "dist", "attached_assets", ".config"]

[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "npm ci --omit=dev && npm run build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[env]
PORT = "5000"

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

[agent]
integrations = [
  "javascript_database:1.0.0",
  "javascript_log_in_with_replit:1.0.0",
  "google-mail:1.0.0",
  "javascript_openai:1.0.0",
]
```

## What This Fixes:

1. **Port Mapping**: Maps port 5000 to external port 80 (correct)
2. **Packager Ignore**: Tells Replit to exclude node_modules from deployment
3. **Deployment Build**: Uses `npm ci --omit=dev` to install only production dependencies
4. **Preview**: The webview will work once port 80 is correctly mapped

## After Making These Changes:

1. Save the `.replit` file
2. The preview should work immediately
3. Publishing should succeed (image size will be under 8 GiB)

## Current Status:
- ✅ Server IS running on port 5000
- ✅ All services operational
- ❌ Port mapping incorrect (blocks preview)
- ❌ Deployment includes node_modules (blocks publishing)
