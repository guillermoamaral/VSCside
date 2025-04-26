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
exports.WebsideFileSystemProvider = void 0;
const vscode = __importStar(require("vscode"));
class WebsideFileSystemProvider {
    constructor(backend) {
        this.backend = backend;
        this.files = new Map();
        // Required event but not used for now
        this.onDidChangeFile = new vscode.EventEmitter().event;
    }
    watch(uri) {
        // Not needed for now
        return { dispose: () => { } };
    }
    stat(uri) {
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
    readFile(uri) {
        const file = this.files.get(uri.path);
        if (!file) {
            throw vscode.FileSystemError.FileNotFound();
        }
        return file.content;
    }
    writeFile(uri, content, options) {
        const file = this.files.get(uri.path);
        if (!file) {
            throw vscode.FileSystemError.FileNotFound();
        }
        // Update local content
        file.content = content;
        // Send to backend
        this.uploadMethod(file.className, file.selector, new TextDecoder().decode(content));
    }
    async uploadMethod(className, selector, sourceCode) {
        const response = await this.backend.post(`/changes`, {
            type: "AddMethod",
            className,
            selector,
            sourceCode,
        });
        if (!response.ok) {
            vscode.window.showErrorMessage(`Failed to save method: ${response.status}`);
            return;
        }
    }
    delete() {
        throw new Error("Delete not supported.");
    }
    rename() {
        throw new Error("Rename not supported.");
    }
    readDirectory() {
        throw new Error("Directory reading not supported.");
    }
    createDirectory() {
        throw new Error("Directory creation not supported.");
    }
    setBackend(newBackend) {
        this.backend = newBackend;
    }
    registerFile(uri, className, selector, source) {
        this.files.set(uri.path, {
            content: new TextEncoder().encode(source),
            className,
            selector,
        });
    }
}
exports.WebsideFileSystemProvider = WebsideFileSystemProvider;
