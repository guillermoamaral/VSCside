import * as vscode from "vscode";
import { WebsideTreeProvider } from "./tree";
import {
	getStoredCredentials,
	resetCredentials,
	showLoginWebview,
} from "./login";
import { showSearchPanel } from "./search";
import { WebsideFileSystemProvider } from "./file";
import { Backend } from "./backend";
import { VscsDocumentLinkProvider } from "./link";

let backend: Backend;
let treeProvider: WebsideTreeProvider | null = null;
let fileProvider: WebsideFileSystemProvider | null = null;

export async function activate(context: vscode.ExtensionContext) {
	try {
		const { backendURL, developer } = await getStoredCredentials(context);
		await setupWebside(context, backendURL, developer);
	} catch (e) {
		const changed = await showLoginWebview(context);
		if (changed) {
			const { backendURL, developer } = await getStoredCredentials(
				context
			);
			await setupWebside(context, backendURL, developer);
		}
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("webside.configure", async () => {
			const changed = await showLoginWebview(context);
			if (changed) {
				const { backendURL, developer } = await getStoredCredentials(
					context
				);
				await reconfigureWebside(backendURL, developer);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"webside.resetCredentials",
			async () => {
				await resetCredentials(context);
				const changed = await showLoginWebview(context);
				if (changed) {
					const { backendURL, developer } =
						await getStoredCredentials(context);
					await reconfigureWebside(backendURL, developer);
				}
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("webside.openSearch", () => {
			showSearchPanel(context, backend, treeProvider!);
		})
	);
}

async function setupWebside(
	context: vscode.ExtensionContext,
	backendURL: string,
	developer: string
) {
	backend = new Backend(backendURL, developer);

	fileProvider = new WebsideFileSystemProvider(backend);
	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider("webside", fileProvider, {
			isCaseSensitive: true,
		})
	);

	treeProvider = new WebsideTreeProvider(backend);
	const treeView = vscode.window.createTreeView("websideExplorer", {
		treeDataProvider: treeProvider,
	});
	treeProvider.registerView(treeView);
	context.subscriptions.push(treeView);

	context.subscriptions.push(
		vscode.commands.registerCommand("webside.openClass", async (item) => {
			const cls = await backend.classNamed(item.className);
			const uri = vscode.Uri.parse(`webside:/${item.className}.st`);
			fileProvider?.registerClassFile(
				uri,
				item.className,
				cls.definition || "Definition not found"
			);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("webside.openMethod", async (item) => {
			const method = await backend.method(item.className, item.selector);
			// vscode.window.showErrorMessage(
			// 	`Failed to load method: ${response.status}`
			// );
			const uri = vscode.Uri.parse(
				`webside:/${item.className}/${encodeURIComponent(
					item.selector
				)}.st`
			);
			fileProvider?.registerMethodFile(
				uri,
				item.className,
				item.selector,
				method.source || "Source not found"
			);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
		})
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentLinkProvider(
			{ language: "smalltalk" },
			new VscsDocumentLinkProvider(backend)
		)
	);
}

async function reconfigureWebside(newBackendURL: string, developer: string) {
	backend = new Backend(newBackendURL, developer);
	if (treeProvider) {
		treeProvider.setBackend(backend);
		treeProvider.refresh();
	}
	if (fileProvider) {
		fileProvider.setBackend(backend);
	}
}

export function deactivate() {}
