import axios from "axios";
import {
	StPackage,
	StClass,
	StMethod,
	StVariable,
	StCategory,
	StObject,
	StDebugger,
	StWorkspace,
	StEvaluation,
	StChange,
	StTestRun,
	StProfiler,
} from "./types";

class BackendError extends Error {
	constructor(
		description: string,
		public url: string,
		public request: any,
		public status?: number,
		public reason?: string,
		public data?: any
	) {
		super(`"${description} (${url}${reason ? " due to " + reason : ""})"`);
		this.name = "BackendError";
	}
}

export default class Backend {
	constructor(
		public url: string,
		public author: string,
		public reportError?: (e: any) => void,
		public reportChange?: (change: any) => void
	) {}

	async get(uri: string): Promise<any> {
		try {
			const response = await axios.get(this.url + uri);
			return response.data;
		} catch (error: any) {
			this.handleError("Cannot get " + uri, uri, error);
		}
	}

	async post(uri: string, payload: any): Promise<any> {
		try {
			const response = await axios.post(this.url + uri, payload);
			return response.data;
		} catch (error: any) {
			this.handleError("Cannot post " + uri, uri, error);
		}
	}

	private handleError(description: string, uri: string, error: any) {
		const status = error.response?.status;
		const reason = error.response?.statusText || error.message;
		const data = error.response?.data;
		throw new BackendError(
			description,
			this.url + uri,
			error.request,
			status,
			reason,
			data
		);
	}

	async packages(): Promise<StPackage[]> {
		return await this.get("/packages");
	}

	async packageNames(): Promise<StPackage[]> {
		return await this.get("/packages?names=true");
	}

	async packageTree(): Promise<StPackage[]> {
		return await this.get("/packages?tree=true");
	}

	async packageClasses(packagename: string): Promise<StClass[]> {
		return await this.get("/packages/" + packagename + "/classes");
	}

	async classNames(): Promise<StClass[]> {
		return await this.get("/classes?names=true");
	}

	async classNamed(className: string): Promise<StClass> {
		return await this.get(`/classes/${encodeURIComponent(className)}`);
	}

	async methods(className: string): Promise<StMethod[]> {
		return await this.get(
			`/classes/${encodeURIComponent(className)}/methods`
		);
	}

	async method(className: string, selector: string): Promise<StMethod> {
		return await this.get(
			`/classes/${className}/methods/${encodeURIComponent(selector)}`
		);
	}

	async dialect(): Promise<string> {
		return await this.get("/dialect");
	}

	async workspaces(): Promise<StWorkspace[]> {
		return await this.get("/workspaces");
	}

	async debuggers(): Promise<StDebugger[]> {
		return await this.get("/debuggers");
	}

	async objects(): Promise<StObject[]> {
		return await this.get("/objects");
	}

	async evaluations(): Promise<StEvaluation[]> {
		return await this.get("/evaluations");
	}

	async lastChanges(): Promise<StChange[]> {
		return await this.get("/changes");
	}

	async testRuns(): Promise<StTestRun[]> {
		return await this.get("/test-runs");
	}

	async profilers(): Promise<StProfiler[]> {
		return await this.get("/profilers");
	}
}
