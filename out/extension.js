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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const tree_1 = require("./tree");
const login_1 = require("./login");
const file_1 = require("./file");
const backend_1 = __importDefault(require("./backend"));
let backend;
let treeProvider = null;
let fileProvider = null;
async function activate(context) {
    try {
        const { backendURL, developer } = await (0, login_1.getStoredCredentials)(context);
        await setupWebside(context, backendURL, developer);
    }
    catch (e) {
        const changed = await (0, login_1.showLoginWebview)(context);
        if (changed) {
            const { backendURL, developer } = await (0, login_1.getStoredCredentials)(context);
            await setupWebside(context, backendURL, developer);
        }
    }
    context.subscriptions.push(vscode.commands.registerCommand("webside.configure", async () => {
        const changed = await (0, login_1.showLoginWebview)(context);
        if (changed) {
            const { backendURL, developer } = await (0, login_1.getStoredCredentials)(context);
            await reconfigureWebside(context, backendURL, developer);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("webside.resetCredentials", async () => {
        await (0, login_1.resetCredentials)(context);
        const changed = await (0, login_1.showLoginWebview)(context);
        if (changed) {
            const { backendURL, developer } = await (0, login_1.getStoredCredentials)(context);
            await reconfigureWebside(context, backendURL, developer);
        }
    }));
}
exports.activate = activate;
async function setupWebside(context, backendURL, developer) {
    backend = new backend_1.default(backendURL, developer);
    fileProvider = new file_1.WebsideFileSystemProvider(backend);
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("webside", fileProvider, {
        isCaseSensitive: true,
    }));
    treeProvider = new tree_1.WebsideTreeProvider(backend);
    context.subscriptions.push(vscode.window.registerTreeDataProvider("websideExplorer", treeProvider));
    context.subscriptions.push(vscode.commands.registerCommand("webside.openMethod", async (item) => {
        const method = await backend.method(item.className, item.selector);
        // vscode.window.showErrorMessage(
        // 	`Failed to load method: ${response.status}`
        // );
        const uri = vscode.Uri.parse(`webside:/${item.className}/${encodeURIComponent(item.selector)}.st`);
        fileProvider?.registerFile(uri, item.className, item.selector, method.source || "Source not found");
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }));
}
async function reconfigureWebside(context, newBackendURL, developer) {
    backend = new backend_1.default(newBackendURL, developer);
    if (treeProvider) {
        treeProvider.setBackend(backend);
        treeProvider.refresh();
    }
    if (fileProvider) {
        fileProvider.setBackend(backend);
    }
}
function deactivate() { }
exports.deactivate = deactivate;
