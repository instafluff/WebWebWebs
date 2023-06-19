import fs from "fs";
import acme from "acme-client";
import comfyWeb from "webwebweb";

const debug = console.log;

async function isCertificateValidWithin30Days( file: string ): Promise<boolean> {
	if( fs.existsSync( file ) ) {
		let cert = fs.readFileSync( file );
		let expiration = ( new Date( ( await acme.forge.readCertificateInfo( cert ) ).notAfter ) ).valueOf();
		let time = ( new Date() ).valueOf();
		if( expiration > time + 60000 * 60 * 24 * 30 ) {
			return true;
		}
	}
	return false;
}

async function createACMEChallenge( authz: any, challenge: any, keyAuthorization: any ) {
	if( challenge.type === "http-01" ) {
		debug( `Creating ACME Challenge for ${authz.identifier.value}` );
		comfyWeb.APIs[ `.well-known/acme-challenge/${challenge.token}` ] = ( qs: any, body: any, opts: any ) => {
			return keyAuthorization;
		};
	}
}

async function removeACMEChallenge( authz: any, challenge: any, keyAuthorization: any ) {
	if( challenge.type === "http-01" ) {
		debug( `Removing ACME Challenge for ${authz.identifier.value}` );
		delete comfyWeb.APIs[ `.well-known/acme-challenge/${challenge.token}` ];
	}
}

async function certificateRefresh( domain: string, email: string, environment: string = "production" ): Promise<boolean> {
	if( await isCertificateValidWithin30Days( `${domain}_${environment}_cert.pem` ) ) {
		return false;
	}

	debug( "Requesting New SSL Certificate..." );
	const client = new acme.Client( {
		directoryUrl: environment === "production" ? acme.directory.letsencrypt.production : acme.directory.letsencrypt.staging,
		accountKey: await acme.forge.createPrivateKey(),
	} );

	const [ key, csr ] = await acme.forge.createCsr( {
		commonName: domain,
	} );

	const cert = await client.auto( {
		csr: csr,
		email: email,
		termsOfServiceAgreed: true,
		challengeCreateFn: createACMEChallenge,
		challengeRemoveFn: removeACMEChallenge,
	} );

	fs.writeFileSync( `${domain}_${environment}_chain.pem`, csr.toString(), "utf8" );
	fs.writeFileSync( `${domain}_${environment}_privkey.pem`, key.toString(), "utf8" );
	fs.writeFileSync( `${domain}_${environment}_cert.pem`, cert.toString(), "utf8" );
	debug( "Saved SSL Certificate." );
	return true;
}

let comfyServer: any;
const proxyStart = comfyWeb.Run;
comfyWeb.Run = async ( port: number, opts: { 
	domain?: string, 
	email?: string, 
	test?: boolean, 
	useCORS?: boolean,
	Certificate?: string,
	PrivateKey?: string,
	CertificateChain?: string,
	Directory?: string 
} = { useCORS: true } ) => {
	if( opts.domain ) {
		proxyStart( 80, {} );
		opts.email = opts.email || `support@${opts.domain}`;
		const env = opts.test ? "staging" : "production";
		opts.CertificateChain = `${opts.domain}_${env}_chain.pem`;
		opts.PrivateKey = `${opts.domain}_${env}_privkey.pem`;
		opts.Certificate = `${opts.domain}_${env}_cert.pem`;
		setInterval( async () => {
			// Check every hour
			let refreshed = await certificateRefresh( opts.domain as string, opts.email as string, env );
			if( refreshed ) {
				if( comfyServer ) {
					debug( "Updating certs" );
					comfyServer.setSecureContext( {
						ca: fs.readFileSync( `${opts.domain}_${env}_chain.pem`, "utf8" ),
						key: fs.readFileSync( `${opts.domain}_${env}_privkey.pem`, "utf8" ),
						cert: fs.readFileSync( `${opts.domain}_${env}_cert.pem`, "utf8" ),
					} );
				}
				else {
					debug( "Starting server" );
					comfyServer = await proxyStart( port, opts );
					console.log( "Server yayayay", comfyServer.setSecureContext );
				}
			}
		}, 1000 * 60 * 60 ); // Every Hour
		await certificateRefresh( opts.domain, opts.email, env );
		if( fs.existsSync( opts.Certificate ) ) {
			comfyServer = await proxyStart( port, opts );
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

comfyWeb.default = comfyWeb; // Make this a default export as well to support ES6 import syntax
export = comfyWeb;
