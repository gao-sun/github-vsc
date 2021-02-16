import { create, IWorkbenchConstructionOptions, IWorkspaceProvider } from 'vs/workbench/workbench.web.api';
import { URI, UriComponents } from 'vs/base/common/uri';
declare const window: any;

(async function () {
	// create workbench
	let config: IWorkbenchConstructionOptions & { folderUri?: UriComponents, workspaceUri?: UriComponents }  = {};

	if(window.product){
		config = window.product;
	}else{
		const result = await fetch('/product.json');
		config = await result.json();
	}


	if (Array.isArray(config.staticExtensions)) {
		config.staticExtensions.forEach(extension => {
			extension.extensionLocation = URI.revive(extension.extensionLocation);
		});
	}

	let workspace;
	if (config.folderUri) {
		workspace = { folderUri: URI.revive(config.folderUri) };
	} else if (config.workspaceUri) {
		workspace = { workspaceUri: URI.revive(config.workspaceUri) };
	} else {
		workspace = undefined;
	}

	const locationCommands = [
		{
			id: 'github-vsc.location.fetch',
			handler: () => window.location,
		},
		{
			id: 'github-vsc.location.replace',
			handler: (url: string) => {
				window.history.replaceState(null, '', url);
			},
		},
		{
			id: 'github-vsc.location.push',
			handler: (url: string) => {
				window.history.pushState(null, '', url);
			},
		},
	];

	if (workspace) {
		const workspaceProvider: IWorkspaceProvider = { workspace, open: async () => {} }
		config = { ...config, workspaceProvider };
	}

	create(document.body, { ...config, commands: [...(config.commands ?? []), ...locationCommands] });
})();
