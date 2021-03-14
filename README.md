# GitHub VSC

Launch VSCode dev environment in your browser. For free.

## How?

Change `github` to `github-vsc` in the URL and press Enter.

E.g. `github.com/gao-sun/eul` -> `github-vsc.com/gao-sun/eul`

[Live Demo](https://github-vsc.com/gao-sun/github-vsc/tree/master/README.md)

## Highlights

🔑 Simple. Just need a PAT for everything.

⚡ Super fast. Get your dev environment ready in up to 10s.

🔌 Flexible. Available for private repos and self-hosted runners.

📝 Cozy. Can just be an online editor without remote session.

## Launch a Remote Session for Dev

1. Activate the 6th tab with GitHub logo in the side bar.
2. Setup your PAT for forking the [runner repo](https://github.com/gao-sun/github-vsc-runner).
3. Choose the nearest runner server and preferred OS, then click "Start Session".

## Is It Free?

TL;DR: **YES. 1) 6 hours per session with PAT. 2) 72 hours with self-hosted runners.**

### Why 6 Hours?

For GitHub-hosted runners, quote from the [Usage Limit](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration#usage-limits) section in the official docs:

> Each job in a workflow can run for up to 6 hours of execution time.

Which means the runner job will be killed after you reach that limit. Also you may notice:

> You can execute up to 1000 API requests in an hour across all actions within a repository.

We're enforcing WebSocket for data transmission inside the job so it'll be OK for casual development.

### Why 72 Hours?

Unfortunately, self-hosted runners also have a [Usage Limit](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners#usage-limits) on the total run time of workflow itself (i.e. 72 hours), and the 1,000 API requests limit also applies.

### Any Method to Get Rid of All These Limitations?

Yes. But there's no one-line script yet. The basic concept is to setup fully controlled runner server/client and trigger client deployment by API hook/network event. Feel free to open an issue if you are interested.

## Online Editor

If you'd like to just do some quick editing, then no need for starting a remote session. Go ahead to make some changes, and you're ready to commit changes to the branch directly or open a pull request based on your access to the repo. [Learn more about the online editor](docs/online-editor.md).

## Engineering

See [detailed explanation](docs/online-editor.md).

## Try It Locally

Make sure you are prepared for the same prerequisites as [Code - OSS](https://github.com/microsoft/vscode/wiki/How-to-Contribute#prerequisites).

```bash
# in ./
# install deps
yarn
# clone and build Code - OSS
yarn build-vsc
# happy hacking on localhost:8080
yarn dev
```

## Credits

Heavily inspired by [github1s](https://github.com/conwnet/github1s), edited vscode compiling part from [vscode-web](https://github.com/Felx-B/vscode-web), and derivated FileSystem implementation from [vscode-web-playground](https://github.com/microsoft/vscode-web-playground).

Also exported the beautiful One Dark theme from [vscode-theme-onedark](https://github.com/akamud/vscode-theme-onedark).
