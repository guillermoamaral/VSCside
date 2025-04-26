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
exports.showLoginWebview = exports.resetCredentials = exports.getStoredCredentials = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function getStoredCredentials(context) {
    const backendURL = context.globalState.get("backendURL");
    const developer = context.globalState.get("developer");
    if (!backendURL || !developer)
        throw new Error("Missing credentials");
    return { backendURL, developer };
}
exports.getStoredCredentials = getStoredCredentials;
async function resetCredentials(context) {
    await context.globalState.update("backendURL", undefined);
    await context.globalState.update("developer", undefined);
    vscode.window.showInformationMessage("Webside credentials have been reset.");
}
exports.resetCredentials = resetCredentials;
function showLoginWebview(context) {
    return new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel("websideLogin", "Configure Webside Connection", vscode.ViewColumn.Active, { enableScripts: true });
        const previousBackend = context.globalState.get("backendURL") || "";
        const previousDeveloper = context.globalState.get("developer") || "";
        panel.webview.html = getWebviewContent(context, previousBackend, previousDeveloper);
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === "connect") {
                const { backendURL, developer } = msg;
                if (!backendURL || !developer)
                    return resolve(false);
                const backendChanged = backendURL !== previousBackend;
                const developerChanged = developer !== previousDeveloper;
                if (backendChanged || developerChanged) {
                    await resetCredentials(context);
                    await context.globalState.update("backendURL", backendURL);
                    await context.globalState.update("developer", developer);
                    vscode.window.showInformationMessage("Webside reconnected.");
                    panel.dispose();
                    resolve(true);
                }
                else {
                    vscode.window.showInformationMessage("Webside connection unchanged.");
                    panel.dispose();
                    resolve(false);
                }
            }
        });
    });
}
exports.showLoginWebview = showLoginWebview;
function getWebviewContent(context, backendURL, developer) {
    const filePath = path.join(context.extensionPath, "media", "login.html");
    const html = fs.readFileSync(filePath, "utf-8");
    return html
        .replace("{{backendURL}}", backendURL)
        .replace("{{developer}}", developer);
}
