"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fs_1 = __importDefault(require("fs"));
const acme_client_1 = __importDefault(require("acme-client"));
const webwebweb_1 = __importDefault(require("webwebweb"));
const debug = console.log;
function isCertificateValidWithin30Days(file) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs_1.default.existsSync(file)) {
            let cert = fs_1.default.readFileSync(file);
            let expiration = (new Date((yield acme_client_1.default.forge.readCertificateInfo(cert)).notAfter)).valueOf();
            let time = (new Date()).valueOf();
            if (expiration > time + 60000 * 60 * 24 * 30) {
                return true;
            }
        }
        return false;
    });
}
function createACMEChallenge(authz, challenge, keyAuthorization) {
    return __awaiter(this, void 0, void 0, function* () {
        if (challenge.type === "http-01") {
            debug(`Creating ACME Challenge for ${authz.identifier.value}`);
            webwebweb_1.default.APIs[`.well-known/acme-challenge/${challenge.token}`] = (qs, body, opts) => {
                return keyAuthorization;
            };
        }
    });
}
function removeACMEChallenge(authz, challenge, keyAuthorization) {
    return __awaiter(this, void 0, void 0, function* () {
        if (challenge.type === "http-01") {
            debug(`Removing ACME Challenge for ${authz.identifier.value}`);
            delete webwebweb_1.default.APIs[`.well-known/acme-challenge/${challenge.token}`];
        }
    });
}
function certificateRefresh(domain, email, environment = "production") {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield isCertificateValidWithin30Days(`${domain}_${environment}_cert.pem`)) {
            return false;
        }
        debug("Requesting New SSL Certificate...");
        const client = new acme_client_1.default.Client({
            directoryUrl: environment === "production" ? acme_client_1.default.directory.letsencrypt.production : acme_client_1.default.directory.letsencrypt.staging,
            accountKey: yield acme_client_1.default.forge.createPrivateKey(),
        });
        const [key, csr] = yield acme_client_1.default.forge.createCsr({
            commonName: domain,
        });
        const cert = yield client.auto({
            csr: csr,
            email: email,
            termsOfServiceAgreed: true,
            challengeCreateFn: createACMEChallenge,
            challengeRemoveFn: removeACMEChallenge,
        });
        fs_1.default.writeFileSync(`${domain}_${environment}_chain.pem`, csr.toString(), "utf8");
        fs_1.default.writeFileSync(`${domain}_${environment}_privkey.pem`, key.toString(), "utf8");
        fs_1.default.writeFileSync(`${domain}_${environment}_cert.pem`, cert.toString(), "utf8");
        debug("Saved SSL Certificate.");
        return true;
    });
}
let comfyServer;
const proxyStart = webwebweb_1.default.Run;
webwebweb_1.default.Run = (port, opts = { useCORS: true }) => __awaiter(void 0, void 0, void 0, function* () {
    if (opts.domain) {
        proxyStart(80, {});
        opts.email = opts.email || `support@${opts.domain}`;
        const env = opts.test ? "staging" : "production";
        opts.CertificateChain = `${opts.domain}_${env}_chain.pem`;
        opts.PrivateKey = `${opts.domain}_${env}_privkey.pem`;
        opts.Certificate = `${opts.domain}_${env}_cert.pem`;
        setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            // Check every hour
            let refreshed = yield certificateRefresh(opts.domain, opts.email, env);
            if (refreshed) {
                if (comfyServer) {
                    debug("Updating certs");
                    comfyServer.setSecureContext({
                        ca: fs_1.default.readFileSync(`${opts.domain}_${env}_chain.pem`, "utf8"),
                        key: fs_1.default.readFileSync(`${opts.domain}_${env}_privkey.pem`, "utf8"),
                        cert: fs_1.default.readFileSync(`${opts.domain}_${env}_cert.pem`, "utf8"),
                    });
                }
                else {
                    debug("Starting server");
                    comfyServer = yield proxyStart(port, opts);
                    console.log("Server yayayay", comfyServer.setSecureContext);
                }
            }
        }), 1000 * 60 * 60); // Every Hour
        yield certificateRefresh(opts.domain, opts.email, env);
        if (fs_1.default.existsSync(opts.Certificate)) {
            comfyServer = yield proxyStart(port, opts);
            return comfyServer;
        }
        else {
            console.warn("WARNING: No Certificate");
            return proxyStart(port, opts);
        }
    }
    else {
        console.warn("WARNING: Domain not defined in options");
        return proxyStart(port, opts);
    }
});
webwebweb_1.default.default = webwebweb_1.default; // Make this a default export as well to support ES6 import syntax
module.exports = webwebweb_1.default;
//# sourceMappingURL=index.js.map