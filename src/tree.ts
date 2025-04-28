import * as vscode from "vscode";
import { Backend } from "./backend";

class SearchItem extends vscode.TreeItem {
	constructor() {
		super("Search", vscode.TreeItemCollapsibleState.None);
		this.iconPath = new vscode.ThemeIcon("search");
		this.command = {
			title: "Search",
			command: "webside.openSearch",
			arguments: [],
		};
	}
}

class PackagesItem extends vscode.TreeItem {
	constructor() {
		super("Packages", vscode.TreeItemCollapsibleState.Collapsed);
		this.iconPath = new vscode.ThemeIcon("library");
	}
}

type CodeItemType = "package" | "class" | "method";

class CodeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly type: CodeItemType,
		public readonly data: any,
		collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		switch (type) {
			case "package":
				this.iconPath = new vscode.ThemeIcon("package");
				break;
			case "class":
				this.iconPath = new vscode.ThemeIcon("symbol-class");
				break;
			case "method":
				this.iconPath = new vscode.ThemeIcon("symbol-method");
				break;
		}
	}
}

export class WebsideTreeProvider
	implements vscode.TreeDataProvider<vscode.TreeItem>
{
	constructor(private backend: Backend) {}
	private _view?: vscode.TreeView<vscode.TreeItem>;
	private _onDidChangeTreeData: vscode.EventEmitter<
		vscode.TreeItem | undefined
	> = new vscode.EventEmitter();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private rootItems: vscode.TreeItem[] = [
		new SearchItem(),
		new PackagesItem(),
	];

	private childrenCache = new Map<
		vscode.TreeItem | undefined,
		vscode.TreeItem[]
	>();

	setBackend(newBackend: Backend) {
		this.backend = newBackend;
		this.refresh();
	}

	registerView(view: vscode.TreeView<vscode.TreeItem>) {
		this._view = view;
	}

	async revealItem(item: vscode.TreeItem) {
		console.log("reveal", item.label);
		if (this._view) {
			try {
				await this._view.reveal(item, {
					expand: true,
					focus: true,
					select: true,
				});
			} catch (err) {
				console.error("Reveal error:", err);
			}
		}
	}

	getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
		return item;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	async getChildren(item?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (this.childrenCache.has(item)) {
			return this.childrenCache.get(item)!;
		}

		if (!item) {
			this.childrenCache.set(undefined, this.rootItems);
			return this.rootItems;
		}

		let children: vscode.TreeItem[] = [];

		if (item instanceof PackagesItem) {
			const packages = await this.backend.packages();
			children = packages
				.sort((a, b) => a.name.localeCompare(b.name))
				.map(
					(pack) =>
						new CodeItem(
							pack.name,
							"package",
							pack,
							vscode.TreeItemCollapsibleState.Collapsed
						)
				);
		}

		if (item instanceof CodeItem && item.type === "package") {
			const classes = await this.backend.packageClasses(item.label);
			children = classes
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((cls) => {
					const item = new CodeItem(
						cls.name,
						"class",
						cls,
						vscode.TreeItemCollapsibleState.Collapsed
					);
					item.command = {
						title: "Open Class",
						command: "webside.openClass",
						arguments: [{ className: cls.name }],
					};
					return item;
				});
		}

		if (item instanceof CodeItem && item.type === "class") {
			const methods = await this.backend.methods(item.label);
			children = methods
				.sort((a, b) => a.selector.localeCompare(b.selector))
				.map((method) => {
					const item = new CodeItem(
						method.selector,
						"method",
						method,
						vscode.TreeItemCollapsibleState.None
					);
					item.command = {
						title: "Open Method",
						command: "webside.openMethod",
						arguments: [
							{
								className: method.methodClass,
								selector: method.selector,
							},
						],
					};
					return item;
				});
		}

		this.childrenCache.set(item, children);
		return children;
	}

	async revealPackage(packageName: string) {
		await this.revealPath(["Packages", packageName]);
	}

	async revealClass(className: string) {
		const species = await this.backend.classNamed(className);
		if (!species || !species.package) {
			vscode.window.showWarningMessage(`Class '${className}' not found.`);
			return;
		}
		await this.revealPath(["Packages", species.package, className]);
	}

	async revealMethod(className: string, selector: string) {
		const species = await this.backend.classNamed(className);
		if (!species || !species.package) {
			vscode.window.showWarningMessage(`Class '${className}' not found.`);
			return;
		}
		await this.revealPath([
			"Packages",
			species.package,
			className,
			selector,
		]);
	}

	private async revealPath(path: string[]) {
		if (!this._view) return;

		let parent: vscode.TreeItem | undefined = undefined;

		for (const label of path) {
			const children: vscode.TreeItem[] = await this.getChildren(parent);
			const found = children.find(
				(c: vscode.TreeItem) => c.label === label
			);
			if (!found) {
				vscode.window.showWarningMessage(`Cannot find node '${label}'`);
				return;
			}
			await this.revealItem(found);
			parent = found;
		}
	}
}
