import axios from "axios";
import {
	StPackage,
	StClass,
	StVariable,
	StMethod,
	StChange,
	StWorkspace,
	StDebugger,
	StFrame,
	StBinding,
	StEvaluation,
	StObject,
	StTestRun,
	StProfileResult,
} from "./types";

export class BackendError extends Error {
	url?: string;
	request?: any;
	status?: number | null;
	reason?: string | null;
	data?: any;

	constructor(
		description: string,
		url?: string,
		request?: any,
		status?: number | null,
		reason?: string | null,
		data?: any
	) {
		const explanation =
			reason && reason.length > 0 ? " due to " + reason : "";
		const message = `"${description} (${url}${explanation})"`;
		super(message);
		this.name = "BackendError";
		this.url = url;
		this.request = request;
		this.status = status;
		this.reason = reason;
		this.data = data;
	}
}

export class Backend {
	useChanges: null | boolean;
	constructor(
		private url: string,
		private author: string,
		private reportError?: (error: any) => void,
		private reportChange?: (change: any) => void
	) {
		this.useChanges = null;
	}

	async get<T = any>(uri: string, description?: string): Promise<T> {
		try {
			console.log(uri);
			const response = await axios.get(this.url + uri);
			console.log(response.data);
			return response.data;
		} catch (error) {
			this.handleError("Cannot get " + (description || uri), uri, error);
			throw error;
		}
	}

	async post<T = any>(
		uri: string,
		payload: any,
		description?: string
	): Promise<T> {
		try {
			const response = await axios.post(this.url + uri, payload);
			return response.data;
		} catch (error) {
			this.handleError("Cannot post " + (description || uri), uri, error);
			throw error;
		}
	}

	async put<T = any>(
		uri: string,
		payload: any,
		description?: string
	): Promise<T> {
		try {
			const response = await axios.put(this.url + uri, payload);
			return response.data;
		} catch (error) {
			this.handleError("Cannot put " + (description || uri), uri, error);
			throw error;
		}
	}

	async delete<T = any>(uri: string, description?: string): Promise<T> {
		try {
			const response = await axios.delete(this.url + uri);
			return response.data;
		} catch (error) {
			this.handleError(
				"Cannot delete " + (description || uri),
				uri,
				error
			);
			throw error;
		}
	}

	private handleError(description: string, uri: string, error: any) {
		let status: number | undefined;
		let reason: string | undefined;
		let data: any;
		if (error.response) {
			status = error.response.status;
			reason = error.response.statusText;
			data = error.response.data;
		} else if (error.request) {
			reason = error.message;
		}
		const exception = new BackendError(
			description,
			this.url + uri,
			error.request,
			status,
			reason,
			data
		);
		if (this.reportError) {
			this.reportError(exception);
		}
	}

	async dialect(): Promise<string> {
		return await this.get("/dialect");
	}

	async version(): Promise<string> {
		return await this.get("/version");
	}

	// Code endpoints...

	async packages(): Promise<StPackage[]> {
		return this.get("/packages", "package names");
	}

	async packageNames(): Promise<string[]> {
		return this.get("/packages?names=true", "package names");
	}

	async packageTree(): Promise<StPackage[]> {
		return this.get("/packages?tree=true", "package tree");
	}

	async packageNamed(packageName: string): Promise<StPackage> {
		return this.get(
			`/packages/${encodeURIComponent(packageName)}`,
			"package"
		);
	}

	async packageClasses(
		packageName: string,
		extended = false,
		category?: string
	): Promise<StClass[]> {
		let uri = `/packages/${encodeURIComponent(
			packageName
		)}/classes?tree=true&extended=${extended}`;
		if (category) uri += `&category=${encodeURIComponent(category)}`;
		return this.get(uri, `classes from package ${packageName}`);
	}

	async classTree(
		root: string,
		depth: number,
		onlyNames = false
	): Promise<StClass> {
		const tree = await this.get<StClass[]>(
			`/classes?names=${onlyNames}&root=${encodeURIComponent(
				root
			)}&tree=true&depth=${depth}`,
			`class tree from ${root}`
		);
		return tree[0];
	}

	async classTree2(root: string | StClass, depth: number): Promise<StClass> {
		const species =
			typeof root === "string" ? await this.classNamed(root) : root;
		if (depth === 0) {
			return species;
		}
		species.subclasses = await this.subclasses(species.name);
		await Promise.all(
			species.subclasses.map(
				async (c) => await this.classTree2(c, depth - 1)
			)
		);
		return species;
	}

	async classNames(): Promise<string[]> {
		return this.get("/classes?names=true", "class names");
	}

	async classNamed(className: string): Promise<StClass> {
		return this.get(
			`/classes/${encodeURIComponent(className)}`,
			`class ${className}`
		);
	}

	async superclasses(className: string): Promise<StClass[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/superclasses`,
			`superclasses of ${className}`
		);
	}

	async subclasses(className: string): Promise<StClass[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/subclasses`,
			`subclasses of ${className}`
		);
	}

	async instanceVariables(className: string): Promise<StVariable[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/instance-variables`,
			`instance variables of ${className}`
		);
	}

	async classVariables(className: string): Promise<StVariable[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/class-variables`,
			`class variables of ${className}`
		);
	}

	async variables(className: string): Promise<StVariable[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/variables`,
			`variables of ${className}`
		);
	}

	async categories(className: string): Promise<string[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/categories`,
			`categories of ${className}`
		);
	}

	async usedCategories(className: string): Promise<string[]> {
		return this.get(
			`/classes/${encodeURIComponent(className)}/used-categories`,
			`categories used in ${className}`
		);
	}

	async allCategories(): Promise<string[]> {
		return this.get("/categories", "all categories");
	}

	async usualCategories(meta = false): Promise<string[]> {
		return this.get(`/usual-categories?meta=${meta}`, "usual categories");
	}

	async selectors(className: string, sorted = false): Promise<string[]> {
		const selectors = await this.get<string[]>(
			`/classes/${encodeURIComponent(className)}/selectors`,
			`selectors of ${className}`
		);
		if (sorted) {
			selectors.sort((a, b) => (a <= b ? -1 : 1));
		}
		return selectors;
	}

	async methods(
		className: string,
		sorted = false,
		basic = false
	): Promise<StMethod[]> {
		let uri = `/classes/${encodeURIComponent(className)}/methods`;
		if (basic) uri += "?basic=true";
		const methods = await this.get<StMethod[]>(
			uri,
			`methods of ${className}`
		);
		if (sorted) {
			methods.sort((a, b) => (a.selector <= b.selector ? -1 : 1));
		}
		return methods;
	}

	async method(className: string, selector: string): Promise<StMethod> {
		const encodedSelector = encodeURIComponent(selector);
		return this.get(
			`/classes/${encodeURIComponent(
				className
			)}/methods/${encodedSelector}?bytecodes=true&disassembly=true&ast=true&annotations=true`,
			`method ${className}>>${selector}`
		);
	}

	async methodHistory(
		className: string,
		selector: string
	): Promise<StChange[]> {
		const encodedSelector = encodeURIComponent(selector);
		return this.get(
			`/classes/${encodeURIComponent(
				className
			)}/methods/${encodedSelector}/history`,
			`history of ${className}>>${selector}`
		);
	}

	async autocompletions(
		className: string,
		source: string,
		position: number
	): Promise<any[]> {
		const data = { class: className, source, position };
		return this.post(
			"/autocompletions",
			data,
			`autocompletions for ${source} at ${position}`
		);
	}

	async searchClassNames(text: string): Promise<string[]> {
		const results = await this.search(text, true, "similar", "class");
		return results.map((r: { text: string }) => r.text);
	}

	async searchPackageNames(text: string): Promise<string[]> {
		const results = await this.search(text, true, "similar", "package");
		return results.map((r: { text: string }) => r.text);
	}

	async search(
		text: string,
		ignoreCase = false,
		condition = "beginning",
		type = "all"
	): Promise<any[]> {
		return this.get(
			`/search?text=${encodeURIComponent(
				text
			)}&ignoreCase=${ignoreCase}&condition=${condition}&type=${type}`,
			`search for ${text}`
		);
	}

	async selectorInSource(source: string, position: number): Promise<any> {
		const data = { source, position };
		return this.post("/selectors", data, "selector in source");
	}

	async senders(selector: string, basic = false): Promise<StMethod[]> {
		let uri = `/methods?sending=${encodeURIComponent(selector)}`;
		if (basic) uri += "&basic=true";
		return this.get(uri, `senders of ${selector}`);
	}

	async accessors(
		className: string,
		variable: string,
		type: string,
		sorted = false,
		basic = false
	): Promise<StMethod[]> {
		let uri = `/classes/${encodeURIComponent(
			className
		)}/methods?${type}=${encodeURIComponent(variable)}`;
		if (basic) uri += "&basic=true";
		const methods = await this.get<StMethod[]>(
			uri,
			`methods using ${variable} in ${className}`
		);
		if (sorted) {
			methods.sort((a, b) => (a.selector <= b.selector ? -1 : 1));
		}
		return methods;
	}

	async sendersCount(selector: string): Promise<number> {
		let result = await this.get<any>(
			`/methods?count=true&sending=${encodeURIComponent(selector)}`,
			`senders of ${selector}`
		);
		if (Array.isArray(result)) result = result.length;
		return result;
	}

	async localSenders(
		selector: string,
		className: string,
		basic = false
	): Promise<StMethod[]> {
		let uri = `/methods?sending=${encodeURIComponent(
			selector
		)}&hierarchy=${encodeURIComponent(className)}`;
		if (basic) uri += "&basic=true";
		return this.get(uri, `local senders of ${selector} in ${className}`);
	}

	async classReferences(
		className: string,
		basic = false
	): Promise<StMethod[]> {
		let uri = `/methods?referencingClass=${encodeURIComponent(className)}`;
		if (basic) uri += "&basic=true";
		return this.get(uri, `references to class ${className}`);
	}

	async stringReferences(value: string, basic = false): Promise<StMethod[]> {
		let uri = `/methods?referencingString=${encodeURIComponent(value)}`;
		if (basic) uri += "&basic=true";
		return this.get(uri, `references to string ${value}`);
	}

	async implementors(selector: string, basic = false): Promise<StMethod[]> {
		let uri = `/methods?selector=${encodeURIComponent(selector)}`;
		if (basic) uri += "&basic=true";
		return this.get(uri, `implementors of ${selector}`);
	}

	async localImplementors(
		selector: string,
		className: string,
		basic = false
	): Promise<StMethod[]> {
		let uri = `/methods?selector=${encodeURIComponent(
			selector
		)}&hierarchy=${encodeURIComponent(className)}`;
		if (basic) uri += "&basic=true";
		return this.get(
			uri,
			`local implementors of ${selector} in ${className}`
		);
	}

	async methodsMatching(pattern: string, basic = false): Promise<StMethod[]> {
		let uri = `/methods?selectorMatching=${encodeURIComponent(pattern)}`;
		if (basic) uri += "&basic=true";
		return this.get(uri, `methods matching ${pattern}`);
	}

	async methodTemplate(): Promise<string> {
		return this.get("/methodtemplate", "method template");
	}

	async classTemplate(packageName: string): Promise<string> {
		return this.get(
			`/classtemplate?package=${encodeURIComponent(packageName)}`,
			"class template"
		);
	}

	async methodsInCategory(
		className: string,
		category: string,
		sorted = false,
		basic = false
	): Promise<StMethod[]> {
		let uri = `/classes/${encodeURIComponent(
			className
		)}/methods?category=${encodeURIComponent(category)}`;
		if (basic) uri += "&basic=true";
		const methods = await this.get<StMethod[]>(
			uri,
			`methods in category ${category} of class ${className}`
		);
		if (sorted) {
			methods.sort((a, b) => (a.selector <= b.selector ? -1 : 1));
		}
		return methods;
	}

	// Changes endpoints...

	async usesChanges(): Promise<boolean> {
		if (this.useChanges === null) {
			try {
				await this.get("/changes");
				this.useChanges = true;
			} catch (error: any) {
				this.useChanges =
					!error.response || error.response.status !== 404;
			}
		}
		return this.useChanges;
	}

	async lastChanges(): Promise<StChange[]> {
		return await this.get("/changes", "changes");
	}

	newChange(type: string): StChange {
		return { type, author: this.author };
	}

	async postChange(change: StChange, description: string): Promise<StChange> {
		const supported = await this.usesChanges();
		if (!supported) {
			throw new BackendError(
				"Changes not supported",
				this.url + "/changes",
				null,
				null,
				null,
				null
			);
		}
		const applied = await this.post("/changes", change, description);
		if (this.reportChange) {
			this.reportChange(applied);
		}
		return applied;
	}

	async postCommand(command: any, description: string): Promise<any> {
		return await this.post("/commands", command, description);
	}

	async downloadChanges(changes: any): Promise<any> {
		return await this.post(
			"/changesets/download",
			changes,
			"download changes"
		);
	}

	async uploadChangeset(changeset: any): Promise<any> {
		return await this.post(
			"/changesets/upload",
			changeset,
			"upload changeset"
		);
	}

	async updateChanges(changes: any): Promise<any> {
		return await this.post("/changes/update", changes, "update changes");
	}

	async compressChanges(changes: any): Promise<any> {
		return await this.post(
			"/changes/compress",
			changes,
			"compress changes"
		);
	}

	// async extensions(elementType: string): Promise<StExtension[]> {
	// 	const extensions = await this.get("/extensions", "extensions");
	// 	return extensions.filter((e: any) => e.elementType === elementType);
	// }

	// async commandDefinitions(
	// 	elementType: string
	// ): Promise<StCommandDefinition[]> {
	// 	const definitions = await this.get(
	// 		"/command-definitions",
	// 		"command definitions"
	// 	);
	// 	return definitions.filter((e: any) => e.elementType === elementType);
	// }

	// ----- Change helpers -----

	async createPackage(packageName: string): Promise<StChange> {
		const change = this.newChange("AddPackage");
		change.name = packageName;
		const supported = await this.usesChanges();
		if (!supported) {
			await this.post(
				"/packages/",
				change,
				`create package ${packageName}`
			);
			return change;
		}
		return await this.postChange(change, `create package ${packageName}`);
	}

	async removePackage(packageName: string): Promise<StChange> {
		const change = this.newChange("RemovePackage");
		change.name = packageName;
		const supported = await this.usesChanges();
		if (!supported) {
			await this.delete(
				`/packages/${encodeURIComponent(packageName)}`,
				`remove package ${packageName}`
			);
			return change;
		}
		return await this.postChange(change, `remove package ${packageName}`);
	}

	async renamePackage(
		packageName: string,
		newName: string
	): Promise<StChange> {
		const change = this.newChange("RenamePackage");
		change.name = packageName;
		change.newName = newName;
		return await this.postChange(change, `rename package ${packageName}`);
	}

	async defineClass(
		className: string,
		superClassName: string,
		packageName: string,
		definition: any
	): Promise<StChange> {
		const change = this.newChange("AddClass");
		change.className = className;
		change.superclass = superClassName;
		change.package = packageName;
		change.definition = definition;
		const supported = await this.usesChanges();
		if (!supported) {
			const species = await this.post(
				"/classes/",
				change,
				`define class ${className}`
			);
			change.className = species.name;
			change.definition = species.definition;
			return change;
		}
		return await this.postChange(change, `define class ${className}`);
	}

	async commentClass(className: string, comment: string): Promise<StChange> {
		const change = this.newChange("CommentClass");
		change.className = className;
		change.comment = comment;
		return await this.postChange(change, `comment class ${className}`);
	}

	async removeClass(className: string): Promise<StChange> {
		const change = this.newChange("RemoveClass");
		change.className = className;
		const supported = await this.usesChanges();
		if (!supported) {
			await this.delete(
				`/classes/${encodeURIComponent(className)}`,
				`remove class ${className}`
			);
			return change;
		}
		return await this.postChange(change, `remove class ${className}`);
	}

	async renameClass(
		className: string,
		newName: string,
		renameReferences = true
	): Promise<StChange> {
		const change = this.newChange("RenameClass");
		change.className = className;
		change.newName = newName;
		change.renameReferences = renameReferences;
		return await this.postChange(change, `rename class ${className}`);
	}

	async addInstanceVariable(
		className: string,
		variable: string
	): Promise<StChange> {
		const change = this.newChange("AddInstanceVariable");
		change.className = className;
		change.variable = variable;
		return await this.postChange(
			change,
			`add instance variable ${variable} to ${className}`
		);
	}

	async addClassVariable(
		className: string,
		variable: string
	): Promise<StChange> {
		const change = this.newChange("AddClassVariable");
		change.className = className;
		change.variable = variable;
		return await this.postChange(
			change,
			`add class variable ${variable} to ${className}`
		);
	}

	async renameInstanceVariable(
		className: string,
		variable: string,
		newName: string
	): Promise<StChange> {
		const change = this.newChange("RenameInstanceVariable");
		change.className = className;
		change.variable = variable;
		change.newName = newName;
		return await this.postChange(
			change,
			`rename instance variable ${variable} to ${newName} in class ${className}`
		);
	}

	async renameClassVariable(
		className: string,
		variable: string,
		newName: string
	): Promise<StChange> {
		const change = this.newChange("RenameClassVariable");
		change.className = className;
		change.variable = variable;
		change.newName = newName;
		return await this.postChange(
			change,
			`rename class variable ${variable} to ${newName} in class ${className}`
		);
	}

	async removeInstanceVariable(
		className: string,
		variable: string
	): Promise<StChange> {
		const change = this.newChange("RemoveInstanceVariable");
		change.className = className;
		change.variable = variable;
		return await this.postChange(
			change,
			`remove instance variable ${variable} from ${className}`
		);
	}

	async removeClassVariable(
		className: string,
		variable: string
	): Promise<StChange> {
		const change = this.newChange("RemoveClassVariable");
		change.className = className;
		change.variable = variable;
		return await this.postChange(
			change,
			`remove class variable ${variable} from ${className}`
		);
	}

	async moveInstanceVariableUp(
		className: string,
		variable: string
	): Promise<StChange> {
		const change = this.newChange("MoveUpInstanceVariable");
		change.className = className;
		change.variable = variable;
		return await this.postChange(
			change,
			`move up variable ${variable} in class ${className}`
		);
	}

	async moveInstanceVariableDown(
		className: string,
		variable: string,
		target: string
	): Promise<StChange> {
		const change = this.newChange("MoveDownInstanceVariable");
		change.className = className;
		change.variable = variable;
		change.target = target;
		return await this.postChange(
			change,
			`move down variable ${variable} in class ${className}`
		);
	}

	async renameCategory(
		className: string,
		category: string,
		newName: string
	): Promise<StChange> {
		const change = this.newChange("RenameCategory");
		change.className = className;
		change.category = category;
		change.newName = newName;
		return await this.postChange(
			change,
			`rename category ${category} to ${newName} in class ${className}`
		);
	}

	async removeCategory(
		className: string,
		category: string
	): Promise<StChange> {
		const change = this.newChange("RemoveCategory");
		change.className = className;
		change.category = category;
		return await this.postChange(
			change,
			`remove category ${category} from class ${className}`
		);
	}

	async compileMethod(
		className: string,
		packageName: string,
		category: string,
		source: string
	): Promise<StChange> {
		const description = `compile method in ${className}`;
		const change = this.newChange("AddMethod");
		change.className = className;
		change.package = packageName;
		change.category = category;
		change.sourceCode = source;
		const supported = await this.usesChanges();
		if (!supported) {
			const method = await this.post(
				`/classes/${className}/methods`,
				change,
				description
			);
			change.selector = method.selector;
			change.sourceCode = method.source;
			return change;
		}
		return await this.postChange(change, description);
	}

	async removeMethod(className: string, selector: string): Promise<StChange> {
		const change = this.newChange("RemoveMethod");
		change.className = className;
		change.selector = selector;
		const supported = await this.usesChanges();
		if (!supported) {
			await this.delete(
				`/classes/${className}/methods/${selector}`,
				`remove method ${selector} in ${className}`
			);
			return change;
		}
		return await this.postChange(
			change,
			`remove method ${selector} in ${className}`
		);
	}

	async classifyMethod(
		className: string,
		selector: string,
		category: string
	): Promise<StChange> {
		const change = this.newChange("ClassifyMethod");
		change.className = className;
		change.selector = selector;
		change.category = category;
		return await this.postChange(
			change,
			`classify method ${selector} under ${category}`
		);
	}

	async renameSelector(
		className: string,
		selector: string,
		newSelector: string
	): Promise<StChange> {
		const change = this.newChange("RenameMethod");
		change.className = className;
		change.selector = selector;
		change.newSelector = newSelector;
		return await this.postChange(
			change,
			`rename selector ${selector} to ${newSelector}`
		);
	}

	async addClassCategory(
		packageName: string,
		category: string
	): Promise<StChange> {
		const change = this.newChange("AddClassCategory");
		change.package = packageName;
		change.category = category;
		return await this.postChange(
			change,
			`add class category ${category} to package ${packageName}`
		);
	}

	async renameClassCategory(
		packageName: string,
		category: string,
		newName: string
	): Promise<StChange> {
		const change = this.newChange("RenameClassCategory");
		change.package = packageName;
		change.category = category;
		change.newName = newName;
		return await this.postChange(
			change,
			`rename class category ${category} to ${newName} in package ${packageName}`
		);
	}

	async removeClassCategory(
		packageName: string,
		category: string
	): Promise<StChange> {
		const change = this.newChange("RemoveClassCategory");
		change.package = packageName;
		change.category = category;
		return await this.postChange(
			change,
			`remove class category ${category} from package ${packageName}`
		);
	}

	// Objects endpoints...

	async objects(): Promise<StObject[]> {
		return await this.get("/objects", "objects");
	}

	async objectWithId(id: string): Promise<StObject> {
		return await this.get(
			`/objects/${encodeURIComponent(id)}`,
			`object with id ${id}`
		);
	}

	async unpinObject(id: string): Promise<void> {
		await this.delete(
			`/objects/${encodeURIComponent(id)}`,
			`unpin object with id ${id}`
		);
	}

	async unpinAllObjects(): Promise<void> {
		await this.delete("/objects", "unpin all objects");
	}

	async objectNamedSlots(id: string, path: string): Promise<StObject[]> {
		return await this.objectSlot(id, `${path}/named-slots`);
	}

	async objectIndexedSlots(id: string, path: string): Promise<StObject[]> {
		return await this.objectSlot(id, `${path}/indexed-slots`);
	}

	async objectInstanceVariables(
		id: string,
		path: string
	): Promise<StObject[]> {
		return await this.objectSlot(id, `${path}/instance-variables`);
	}

	async objectViews(id: string, path: string): Promise<StObject[]> {
		return await this.objectSlot(id, `${path}/custom-views`);
	}

	async objectSlot(id: string, path: string): Promise<StObject[]> {
		return await this.get(
			`/objects/${encodeURIComponent(id)}${path}`,
			`${path} of object with id ${id}`
		);
	}

	async pinObjectSlot(id: string, path: string): Promise<void> {
		const uri = `/objects/${encodeURIComponent(id)}${path}`;
		await this.post("/objects", { uri }, `pin slot at URI ${uri}`);
	}

	// Evaluations endpoints...

	async evaluateExpression(
		expression: string,
		sync = false,
		pin = false,
		context?: string,
		assignee?: string
	): Promise<StEvaluation> {
		const evaluation = { expression, context, sync, pin, assignee };
		return await this.issueEvaluation(evaluation);
	}

	async issueEvaluation(evaluation: {
		expression: string;
		context?: string;
		sync?: boolean;
		pin?: boolean;
		assignee?: string;
	}): Promise<StEvaluation> {
		return await this.post(
			"/evaluations",
			evaluation,
			`evaluate ${evaluation.expression}`
		);
	}

	async pauseEvaluation(id: string): Promise<any> {
		return await this.post(
			`/evaluations/${id}/pause`,
			null,
			`pause evaluation with id ${id}`
		);
	}

	async cancelEvaluation(id: string): Promise<any> {
		return await this.delete(
			`/evaluations/${id}`,
			`cancel evaluation with id ${id}`
		);
	}

	async evaluation(id: string): Promise<StEvaluation> {
		return await this.get(
			`/evaluations/${id}`,
			`retrieve evaluation with id ${id}`
		);
	}

	async evaluations(): Promise<StEvaluation[]> {
		return await this.get("/evaluations", "retrieve evaluations");
	}

	async debugExpression(expression: string, context?: string): Promise<any> {
		const evaluation = { expression, context, debug: true, pin: false };
		return await this.post(
			"/evaluations",
			evaluation,
			`debug ${expression}`
		);
	}

	async profileExpression(
		expression: string,
		context?: string
	): Promise<any> {
		const evaluation = { expression, context, profile: true, pin: false };
		return await this.post(
			"/evaluations",
			evaluation,
			`profile ${expression}`
		);
	}

	// Debuggers endpoints...

	async debuggers(): Promise<StDebugger[]> {
		return await this.get("/debuggers", "debuggers");
	}

	async createDebugger(id: string): Promise<StDebugger> {
		const evaluation = { evaluation: id };
		return await this.post(
			"/debuggers",
			evaluation,
			`create debugger on evaluation ${id}`
		);
	}

	async debuggerFrames(id: string): Promise<StFrame[]> {
		return await this.get(
			`/debuggers/${id}/frames`,
			`frames of debugger ${id}`
		);
	}

	async debuggerFrame(id: string, index: number): Promise<StFrame> {
		return await this.get(
			`/debuggers/${id}/frames/${index}`,
			`frame ${index} in debugger ${id}`
		);
	}

	async frameBindings(id: string, index: number): Promise<StBinding> {
		return await this.get(
			`/debuggers/${id}/frames/${index}/bindings`,
			`bindings of frame ${index} in debugger ${id}`
		);
	}

	async stepIntoDebugger(id: string, index: number): Promise<void> {
		await this.post(
			`/debuggers/${id}/frames/${index}/stepinto`,
			null,
			`step into on frame ${index} of debugger ${id}`
		);
	}

	async stepOverDebugger(id: string, index: number): Promise<void> {
		await this.post(
			`/debuggers/${id}/frames/${index}/stepover`,
			null,
			`step over on frame ${index} of debugger ${id}`
		);
	}

	async stepThroughDebugger(id: string, index: number): Promise<void> {
		await this.post(
			`/debuggers/${id}/frames/${index}/stepthrough`,
			null,
			`step through on frame ${index} of debugger ${id}`
		);
	}

	async restartDebugger(
		id: string,
		index: number,
		update: boolean = false
	): Promise<void> {
		await this.post(
			`/debuggers/${id}/frames/${index}/restart?update=${update}`,
			null,
			`restart on frame ${index} of debugger ${id}`
		);
	}

	async resumeDebugger(id: string): Promise<void> {
		await this.post(
			`/debuggers/${id}/resume`,
			null,
			`resume debugger ${id}`
		);
	}

	async terminateDebugger(id: string): Promise<void> {
		await this.post(
			`/debuggers/${id}/terminate`,
			null,
			`terminate debugger ${id}`
		);
	}

	async deleteDebugger(id: string): Promise<void> {
		await this.delete(`/debuggers/${id}`, `debugger ${id}`);
	}

	async createWorkspace(): Promise<StWorkspace> {
		return await this.post("/workspaces", null);
	}

	async workspaces(): Promise<StWorkspace[]> {
		return await this.get("/workspaces");
	}

	//

	async testRuns(): Promise<StTestRun[]> {
		return await this.get("/test-runs");
	}

	async profilerTreeResults(id: string): Promise<StProfileResult> {
		return await this.get(`/profilers/${id}/tree`);
	}
}
