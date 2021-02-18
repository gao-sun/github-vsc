# GitHub VSC

Use VSCode to view and edit GitHub repos, in your browser. Inspired by [github1s](https://github.com/conwnet/github1s).

## How?

Change `github` to `github-vsc` in the URL and press Enter.

E.g. `github.com/gao-sun/eul` -> `github-vsc.com/gao-sun/eul`

## Highlights

- Available for private repos
- `Cmd + P` (quick navigation) support
- Global text search support (on the default branch)
- Document editing with GitHub commits (fork/commit/pull request)

## Screenshots

![Preview](https://user-images.githubusercontent.com/14722250/108383244-90f12f00-7244-11eb-9332-c34fe464f129.png)

## Limitations

### Quick Navigation

Since there're some huge repos containing thousands of folders/files (imagine someone uploaded `node_modules/`), it'll significantly increase the responding time if we fetch all the files from GitHub API. Thus GitHub VSC will only search current folder when you are typing in the `Cmd + P` panel.

Say the repo has the structure of `foo/a/file1` and `foo/b/file2`:

1. When you typed `foo/` it will show the result as the combination of `foo/a` and `foo/b`.
2. When you typed `foo/a/` it will show a single result `foo/a/file1`.

### Global Text Search

Quote from [GitHub docs](https://docs.github.com/en/rest/reference/search#considerations-for-code-search):

> Due to the complexity of searching code, there are a few restrictions on how searches are performed:
>
> - Only the _default branch_ is considered. In most cases, this will be the `master` branch.
> - Only files smaller than 384 KB are searchable.

Also, the global text search result has NO pagination yet. (It always shows page 1)

## Engineering

### It's Static

GitHub VSC contains only static assets and it's hosted by GitHub Pages. The deployment is in [github-vsc-website](https://github.com/gao-sun/github-vsc-website).

### VSCode in Web

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
