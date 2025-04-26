import * as vscode from "vscode";
import Backend from "./backend";

type NodeType = "package" | "class" | "method";

class SmalltalkNode extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly nodeType: NodeType,
		public readonly data: any,
		collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		switch (nodeType) {
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

	private _onDidChangeTreeData: vscode.EventEmitter<
		vscode.TreeItem | undefined
	> = new vscode.EventEmitter();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	setBackend(newBackend: Backend) {
		this.backend = newBackend;
	}

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (!element) {
			const packages = await this.backend.packages();
			return packages
				.sort((a, b) => a.name.localeCompare(b.name))
				.map(
					(pack) =>
						new SmalltalkNode(
							pack.name,
							"package",
							pack,
							vscode.TreeItemCollapsibleState.Collapsed
						)
				);
		} else if (
			element instanceof SmalltalkNode &&
			element.nodeType === "package"
		) {
			const classes = await this.backend.packageClasses(element.label);
			return classes
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((cls) => {
					const item = new SmalltalkNode(
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
		} else if (
			element instanceof SmalltalkNode &&
			element.nodeType === "class"
		) {
			const methods = await this.backend.methods(element.label);
			return methods
				.sort((a, b) => a.selector.localeCompare(b.selector))
				.map((method) => {
					const item = new SmalltalkNode(
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
								className: element.label,
								selector: method.selector,
							},
						],
					};
					return item;
				});
		}
		return [];
	}
}
