registerAction2(class SetSideBarViewAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.setSideBarViewIndex',
			title: { value: localize('setSideBarViewIndex', 'Set Side Bar View Index'), original: 'Set Side Bar View Index' },
			category: CATEGORIES.View,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor, targetIndex: number): Promise<void> {
		const activityBarService = accessor.get(IActivityBarService);
		const viewletService = accessor.get(IViewletService);

		const visibleViewletIds = activityBarService.getVisibleViewContainerIds();

		const activeViewlet = viewletService.getActiveViewlet();
		if (!activeViewlet) {
			return;
		}
		let targetViewletId: string | undefined;
		for (let i = 0; i < visibleViewletIds.length; i++) {
			if (visibleViewletIds[i] === activeViewlet.getId()) {
				targetViewletId = visibleViewletIds[targetIndex];
				break;
			}
		}

		if (targetViewletId) {
			await viewletService.openViewlet(targetViewletId, true);
		}
	}
});
