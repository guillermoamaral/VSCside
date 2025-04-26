"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsideTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class SmalltalkNode extends vscode.TreeItem {
    constructor(label, nodeType, data, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.nodeType = nodeType;
        this.data = data;
        switch (nodeType) {
            case "package":
                this.iconPath = new vscode.ThemeIcon("package");
                break;
            case "class":
                this.iconPath = new vscode.ThemeIcon("symbol-class");
                break;
            case "method":
                this.iconPath = new vscode.ThemeIcon("symbol-method");
                break;
        }
    }
}
class WebsideTreeProvider {
    constructor(backend) {
        this.backend = backend;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    getTreeItem(element) {
        return element;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    setBackend(newBackend) {
        this.backend = newBackend;
    }
    async getChildren(element) {
        if (!element) {
            const packages = await this.backend.packages();
            return packages
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((pack) => new SmalltalkNode(pack.name, "package", pack, vscode.TreeItemCollapsibleState.Collapsed));
        }
        else if (element instanceof SmalltalkNode &&
            element.nodeType === "package") {
            const classes = await this.backend.packageClasses(element.label);
            return classes
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((cls) => new SmalltalkNode(cls.name, "class", cls, vscode.TreeItemCollapsibleState.Collapsed));
        }
        else if (element instanceof SmalltalkNode &&
            element.nodeType === "class") {
            const methods = await this.backend.methods(element.label);
            return methods
                .sort((a, b) => a.selector.localeCompare(b.selector))
                .map((method) => {
                const item = new SmalltalkNode(method.selector, "method", method, vscode.TreeItemCollapsibleState.None);
                item.command = {
                    title: "Open Method",
                    command: "webside.openMethod",
                    arguments: [
                        {
                            className: element.label,
                            selector: method.selector,
                        },
                    ],
                };
                return item;
            });
        }
        return [];
    }
}
exports.WebsideTreeProvider = WebsideTreeProvider;
