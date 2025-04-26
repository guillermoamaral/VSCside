"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class BackendError extends Error {
    constructor(description, url, request, status, reason, data) {
        super(`"${description} (${url}${reason ? " due to " + reason : ""})"`);
        this.url = url;
        this.request = request;
        this.status = status;
        this.reason = reason;
        this.data = data;
        this.name = "BackendError";
    }
}
class Backend {
    constructor(url, author, reportError, reportChange) {
        this.url = url;
        this.author = author;
        this.reportError = reportError;
        this.reportChange = reportChange;
    }
    async get(uri) {
        try {
            const response = await axios_1.default.get(this.url + uri);
            return response.data;
        }
        catch (error) {
            this.handleError("Cannot get " + uri, uri, error);
        }
    }
    async post(uri, payload) {
        try {
            const response = await axios_1.default.post(this.url + uri, payload);
            return response.data;
        }
        catch (error) {
            this.handleError("Cannot post " + uri, uri, error);
        }
    }
    handleError(description, uri, error) {
        const status = error.response?.status;
        const reason = error.response?.statusText || error.message;
        const data = error.response?.data;
        throw new BackendError(description, this.url + uri, error.request, status, reason, data);
    }
    async packages() {
        return await this.get("/packages");
    }
    async packageNames() {
        return await this.get("/packages?names=true");
    }
    async packageTree() {
        return await this.get("/packages?tree=true");
    }
    async packageClasses(packagename) {
        return await this.get("/packages/" + packagename + "/classes");
    }
    async classNames() {
        return await this.get("/classes?names=true");
    }
    async methods(className) {
        return await this.get(`/classes/${encodeURIComponent(className)}/methods`);
    }
    async method(className, selector) {
        return await this.get(`/classes/${className}/methods/${encodeURIComponent(selector)}`);
    }
    async dialect() {
        return await this.get("/dialect");
    }
    async workspaces() {
        return await this.get("/workspaces");
    }
    async debuggers() {
        return await this.get("/debuggers");
    }
    async objects() {
        return await this.get("/objects");
    }
    async evaluations() {
        return await this.get("/evaluations");
    }
    async lastChanges() {
        return await this.get("/changes");
    }
    async testRuns() {
        return await this.get("/test-runs");
    }
    async profilers() {
        return await this.get("/profilers");
    }
}
exports.default = Backend;
