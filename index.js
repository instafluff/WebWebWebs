const fs = require( "fs" );
const debug = require( "debug" )( "webwebwebs" );
const acme = require( "acme-client" );
var ComfyClock = require( "comfyclock" );
var comfyWeb = require( "webwebweb" );

async function isCertificateValidWithin30Days( file ) {
    if( fs.existsSync( file ) ) {
        let cert = fs.readFileSync( file );
        let expiration = ( new Date( ( await acme.forge.readCertificateInfo( cert ) ).notAfter ) ).valueOf();
        let time = (new Date()).valueOf();
        if( expiration > time + 60000 * 60 * 24 * 30 ) {
            return true;
        }
    }
    return false;
}

async function createACMEChallenge( authz, challenge, keyAuthorization ) {
    if( challenge.type === 'http-01' ) {
        debug( `Creating ACME Challenge for ${authz.identifier.value}` );
        comfyWeb.APIs[ `.well-known/acme-challenge/${challenge.token}` ] = ( qs, body, opts ) => {
            return keyAuthorization;
        };
    }
}

async function removeACMEChallenge( authz, challenge, keyAuthorization ) {
    if( challenge.type === 'http-01' ) {
        debug( `Removing ACME Challenge for ${authz.identifier.value}` );
        delete comfyWeb.APIs[ `.well-known/acme-challenge/${challenge.token}` ];
    }
}

async function certificateRefresh( domain, email, environment = "production" ) {
    if( await isCertificateValidWithin30Days( `${domain}_${environment}_cert.pem` ) ) {
        return false;
    }

    debug( "Requesting New SSL Certificate..." );
    const client = new acme.Client({
        directoryUrl: environment === "production" ? acme.directory.letsencrypt.production : acme.directory.letsencrypt.staging,
        accountKey: await acme.forge.createPrivateKey()
    });

    const [ key, csr ] = await acme.forge.createCsr({
        commonName: domain
    });

    const cert = await client.auto({
        csr: csr,
        email: email,
        termsOfServiceAgreed: true,
        challengeCreateFn: createACMEChallenge,
        challengeRemoveFn: removeACMEChallenge
    });

    fs.writeFileSync( `${domain}_${environment}_chain.pem`, csr.toString(), "utf8" );
    fs.writeFileSync( `${domain}_${environment}_privkey.pem`, key.toString(), "utf8" );
    fs.writeFileSync( `${domain}_${environment}_cert.pem`, cert.toString(), "utf8" );
    debug( "Saved SSL Certificate." );
    return true;
}

var comfyServer = null;
var proxyStart = comfyWeb.Run;
comfyWeb[ "Run" ] = async ( port, opts ) => {
    if( opts.domain ) {
        proxyStart( 80 );
        opts.email = opts.email || `support@${opts.domain}`;
        opts.env = opts.test ? "staging" : "production";
        opts[ "CertificateChain" ] = `${opts.domain}_${opts.env}_chain.pem`;
        opts[ "PrivateKey" ] = `${opts.domain}_${opts.env}_privkey.pem`;
        opts[ "Certificate" ] = `${opts.domain}_${opts.env}_cert.pem`;
        ComfyClock.Every[ "1h" ] = async ( date ) => {
            // Check every hour
            let refreshed = await certificateRefresh( opts.domain, opts.email, opts.env );
            if( refreshed ) {
                if( comfyServer ) {
                    debug( "Updating certs" );
                    comfyServer.setSecureContext({
                        ca: fs.readFileSync( `${opts.domain}_${opts.env}_chain.pem`, "utf8" ),
                        key: fs.readFileSync( `${opts.domain}_${opts.env}_privkey.pem`, "utf8" ),
                        cert: fs.readFileSync( `${opts.domain}_${opts.env}_cert.pem`, "utf8" ),
                    });
                }
                else {
                    debug( "Starting server" );
                    comfyServer = proxyStart( port, opts );
                }
            }

        }
        await certificateRefresh( opts.domain, opts.email, opts.env );
        if( fs.existsSync( opts[ "Certificate" ] ) ) {
            comfyServer = proxyStart( port, opts );
            return comfyServer;
        }
        else {
            console.warn( "WARNING: No Certificate" );
            return proxyStart( port, opts );
        }
    }
    else {
        console.warn( "WARNING: Domain not defined in options" );
        return proxyStart( port, opts );
    }
};

module.exports = comfyWeb;
