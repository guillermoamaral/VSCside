import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Backend } from "./backend";

export function showSearchPanel(
	context: vscode.ExtensionContext,
	backend: Backend
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
			const results = await backend.search(msg.query);
			panel.webview.postMessage({ command: "results", results });
		} else if (msg.command === "goto") {
			const { type, name } = msg;
			// Aquí tendrías que buscar en el árbol, seleccionar, expandir, etc.
		}
	});
}

function getWebviewContent(context: vscode.ExtensionContext): string {
	const filePath = path.join(context.extensionPath, "media", "search.html");
	return fs.readFileSync(filePath, "utf-8");
}
