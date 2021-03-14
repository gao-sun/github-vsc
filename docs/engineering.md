# Engineering

## Remote Session

### Overview

The architecture is quite simple: 

```
Browser VSC <---wss---> Runner Server <---wss---> Runner Client
```

This is what will happen when you click "Start Session" in browser:

1. Browser VSC establishes WebSocket connection to the runner server.
2. Browser VSC requests a new session.
3. Runner server generates a new session ID and tell Browser VSC the session is started.
4. Browser VSC tries to launch runner client by dispatching workflow with session data.
5. Browser VSC waits for runner client status report.
6. Workflow installs and launches runner client.
7. Runner server receives runner client for current session, then tells browser VSC it's ready to use.

Note the workflow will run in a forked repo to avoid easy usage limit hitting.

### Terminal

When runner client is online, terminal data will be exchanged via WebSocket. Session ID is required to map correct clients.

### Port Forwarding

Only HTTP requests are supported for now. WebSocket forwarding is not availble.

## VSCode in Web

The VSCode in your browser contains only static assets and it's hosted by GitHub Pages. The deployment is in [github-vsc-website](https://github.com/gao-sun/github-vsc-website).

### From Open-Source to Open-Source 

Powered by the [Code - OSS](https://github.com/microsoft/vscode) project, and use the tag `1.53.2` for building. Would like not to do any modifications to keep it clean, but here comes to the result (I've tried hard, trust me):

- `src/vs/code/browser/workbench/workbench.ts` for simple workbench and several html `window` related commands.
- `src/vs/code/browser/workbench/one_dark.ts` for One Dark theme.
- `src/vs/workbench/browser/parts/activitybar/activitybarActions.extended.ts` for an extended command to set the index of active side bar. (They just have go prev/next for now, interesting)
- `src/vs/workbench/contrib/welcome/page/browser/vs_code_welcome_page.ts` for customized welcome page.

### VSCode Extension

Heads to `extensions/github-vsc`, and 2 webpack configs will be shown:

- `webpack.extension.js` and `extension/` for extension itself which runs in a `webworker` environment.
- `webpack.web.js` and `control-panel/` for the control panel web view which using React / SASS modules.
- `d.ts/` and `types/` include shared type definitions.