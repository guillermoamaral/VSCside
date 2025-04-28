import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Backend, BackendError } from "./backend";
import { WebsideTreeProvider } from "./tree";

type SearchMode = "normal" | "disambiguation";

let currentMode: SearchMode = "normal";
let pendingSelector: string | null = null;

export function showSearchPanel(
	context: vscode.ExtensionContext,
	backend: Backend,
	treeProvider: WebsideTreeProvider
) {
	const panel = vscode.window.createWebviewPanel(
		"websideSearch",
		"Search Smalltalk",
		vscode.ViewColumn.One,
		{ enableScripts: true }
	);

	panel.webview.html = getWebviewContent(context);

	panel.webview.onDidReceiveMessage(async (msg) => {
		if (msg.command === "search") {
			currentMode = "normal";
			let results;
			try {
				results = await backend.search(msg.query);
			} catch (error) {
				vscode.window.showWarningMessage((error as Error).toString());
			}
			panel.webview.postMessage({ command: "results", results });
		} else if (msg.command === "goto") {
			if (currentMode === "normal") {
				if (msg.type === "package") {
					await treeProvider.revealPackage(msg.name);
				} else if (msg.type === "class") {
					await treeProvider.revealClass(msg.name);
				} else if (msg.type === "selector") {
					currentMode = "disambiguation";
					pendingSelector = msg.name;
					const implementors = await backend.implementors(msg.name);
					const disambiguationResults = implementors.map(
						(impl: any) => ({
							text: `${impl.className}>>${impl.selector}`,
							className: impl.className,
							selector: impl.selector,
						})
					);
					panel.webview.postMessage({
						command: "disambiguate",
						results: disambiguationResults,
					});
				}
			} else if (currentMode === "disambiguation") {
				if (msg.className && msg.selector) {
					await treeProvider.revealMethod(
						msg.className,
						msg.selector
					);
					currentMode = "normal";
					pendingSelector = null;
				}
			}
		}
	});
}

function getWebviewContent(context: vscode.ExtensionContext): string {
	const filePath = path.join(context.extensionPath, "media", "search.html");
	return fs.readFileSync(filePath, "utf-8");
}
