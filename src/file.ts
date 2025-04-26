import * as vscode from "vscode";
import Backend from "./backend";

interface WebsideClassFile {
	content: Uint8Array;
	className: string;
}

interface WebsideMethodFile {
	content: Uint8Array;
	className: string;
	selector: string;
}

export class WebsideFileSystemProvider implements vscode.FileSystemProvider {
	constructor(private backend: Backend) {}

	private files = new Map<string, WebsideMethodFile | WebsideClassFile>();

	// Required event but not used for now
	onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
		new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;

	watch(uri: vscode.Uri): vscode.Disposable {
		// Not needed for now
		return { dispose: () => {} };
	}

	stat(uri: vscode.Uri): vscode.FileStat {
		const file = this.files.get(uri.path);
		if (!file) {
			throw vscode.FileSystemError.FileNotFound();
		}
		return {
			type: vscode.FileType.File,
			ctime: 0,
			mtime: Date.now(),
			size: file.content.length,
		};
	}

	readFile(uri: vscode.Uri): Uint8Array {
		const file = this.files.get(uri.path);
		if (!file) {
			throw vscode.FileSystemError.FileNotFound();
		}
		return file.content;
	}

	writeFile(
		uri: vscode.Uri,
		content: Uint8Array,
		options: { create: boolean; overwrite: boolean }
	): void {
		const file = this.files.get(uri.path);
		if (!file) {
			throw vscode.FileSystemError.FileNotFound();
		}

		// Update local content
		file.content = content;

		// Send to backend
		if ("selector" in file) {
			this.uploadMethod(
				file.className,
				file.selector,
				new TextDecoder().decode(content)
			);
		} else {
			this.uploadClass(file.className, new TextDecoder().decode(content));
		}
	}

	async uploadClass(className: string, definition: string) {
		const response = await this.backend.post(`/changes`, {
			type: "AddClass",
			className,
			definition,
		});

		if (!response.ok) {
			vscode.window.showErrorMessage(
				`Failed to save class: ${response.status}`
			);
			return;
		}
	}

	async uploadMethod(
		className: string,
		selector: string,
		sourceCode: string
	) {
		const response = await this.backend.post(`/changes`, {
			type: "AddMethod",
			className,
			selector,
			sourceCode,
		});

		if (!response.ok) {
			vscode.window.showErrorMessage(
				`Failed to save method: ${response.status}`
			);
			return;
		}
	}

	delete(): void {
		throw new Error("Delete not supported.");
	}

	rename(): void {
		throw new Error("Rename not supported.");
	}

	readDirectory(): [string, vscode.FileType][] {
		throw new Error("Directory reading not supported.");
	}

	createDirectory(): void {
		throw new Error("Directory creation not supported.");
	}

	setBackend(newBackend: Backend) {
		this.backend = newBackend;
	}

	registerClassFile(uri: vscode.Uri, className: string, definition: string) {
		this.files.set(uri.path, {
			content: new TextEncoder().encode(definition),
			className,
			definition,
		} as WebsideClassFile);
	}

	registerMethodFile(
		uri: vscode.Uri,
		className: string,
		selector: string,
		source: string
	) {
		this.files.set(uri.path, {
			content: new TextEncoder().encode(source),
			className,
			selector,
		} as WebsideMethodFile);
	}
}
