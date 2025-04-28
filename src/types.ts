export interface StPackage {
	name: string;
}

export interface StClass {
	name: string;
	superclass?: string;
	package?: string;
	definition?: string;
	comment?: string;
	subclasses: StClass[];
}

export interface StVariable {
	name: string;
	class: string;
}

export interface StMethod {
	methodClass: string;
	selector: string;
	source: string;
	ast?: any;
	annotations?: any;
	package: string;
}

export interface StChange {
	type: string;
	author: string;
	[key: string]: any;
}

export interface StWorkspace {
	id: string;
	source: string;
	name?: string;
}

export interface StDebugger {
	id: string;
	status: string;
	frames: StFrame[];
}

export interface StFrame {
	index: number;
	selector: string;
	className: string;
	methodName: string;
}

export interface StBinding {
	name: string;
	value: any;
}

export interface StEvaluation {
	id: string;
	status: string;
	expression: string;
	result?: any;
}

export interface StObject {
	id: string;
	className: string;
	slots?: { [key: string]: any };
}

export interface StTestRun {
	id: string;
	status: string;
	results?: any[];
}

export interface StProfileResult {
	id: string;
	tree: any;
	ranking: any;
}
