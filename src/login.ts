import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export async function getStoredCredentials(context: vscode.ExtensionContext) {
	const backendURL = context.globalState.get<string>("backendURL");
	const developer = context.globalState.get<string>("developer");

	if (!backendURL || !developer) throw new Error("Missing credentials");

	return { backendURL, developer };
}

export async function resetCredentials(context: vscode.ExtensionContext) {
	await context.globalState.update("backendURL", undefined);
	await context.globalState.update("developer", undefined);
	vscode.window.showInformationMessage(
		"Webside credentials have been reset."
	);
}

export function showLoginWebview(
	context: vscode.ExtensionContext
): Promise<boolean> {
	return new Promise((resolve) => {
		const panel = vscode.window.createWebviewPanel(
			"websideLogin",
			"Configure Webside Connection",
			vscode.ViewColumn.Active,
			{ enableScripts: true }
		);

		const previousBackend =
			context.globalState.get<string>("backendURL") || "";
		const previousDeveloper =
			context.globalState.get<string>("developer") || "";

		panel.webview.html = getWebviewContent(
			context,
			previousBackend,
			previousDeveloper
		);

		panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.command === "connect") {
				const { backendURL, developer } = msg;

				if (!backendURL || !developer) return resolve(false);

				const backendChanged = backendURL !== previousBackend;
				const developerChanged = developer !== previousDeveloper;

				if (backendChanged || developerChanged) {
					await resetCredentials(context);
					await context.globalState.update("backendURL", backendURL);
					await context.globalState.update("developer", developer);
					vscode.window.showInformationMessage(
						"Webside reconnected."
					);
					panel.dispose();
					resolve(true);
				} else {
					vscode.window.showInformationMessage(
						"Webside connection unchanged."
					);
					panel.dispose();
					resolve(false);
				}
			}
		});
	});
}

function getWebviewContent(
	context: vscode.ExtensionContext,
	backendURL: string,
	developer: string
): string {
	const filePath = path.join(context.extensionPath, "media", "login.html");
	const html = fs.readFileSync(filePath, "utf-8");

	return html
		.replace("{{backendURL}}", backendURL)
		.replace("{{developer}}", developer);
}
