import * as vscode from "vscode";
import { Backend } from "./backend";
import { StClass } from "./types";

export class VscsDocumentLinkProvider implements vscode.DocumentLinkProvider {
	constructor(private backend: Backend) {}

	async provideDocumentLinks(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken
	): Promise<vscode.DocumentLink[]> {
		const text = document.getText();
		const links: vscode.DocumentLink[] = [];

		const regex = /\b[A-Z][A-Za-z0-9_]*\b/g;
		const promises: Promise<void>[] = [];

		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			const className = match[0];
			const range = new vscode.Range(
				document.positionAt(match.index),
				document.positionAt(match.index + className.length)
			);

			const promise = this.backend
				.classNamed(className)
				.then((cls: StClass) => {
					if (cls) {
						const target = vscode.Uri.parse(
							`webside:/${className}.st`
						);
						const link = new vscode.DocumentLink(range, target);
						links.push(link);
					}
				})
				.catch((error: Error) => {
					console.error(`Error checking class ${className}:`, error);
				});

			promises.push(promise);
		}

		await Promise.all(promises);
		return links;
	}
}
