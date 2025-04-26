export interface StPackage {
	name: string;
}

export interface StClass {
	name: string;
	definition: string;
}

export interface StMethod {
	selector: string;
	source: string;
}

export interface StVariable {
	name: string;
	type: string;
}

export interface StCategory {
	name: string;
}

export interface StObject {
	id: string;
	className: string;
	label: string;
}

export interface StDebugger {
	id: string;
	frames: any[];
}

export interface StWorkspace {
	id: string;
	bindings: any[];
}

export interface StEvaluation {
	id: string;
	expression: string;
}

export interface StChange {
	id: string;
	description: string;
}

export interface StTestRun {
	id: string;
	status: string;
}

export interface StProfiler {
	id: string;
	tree: any;
	ranking: any;
}
