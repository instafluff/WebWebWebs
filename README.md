# WebWebWebs
The lightest alternative to ExpressJS with HTTPS. The Comfiest Way to make web APIs and static file servers with automated SSL Certificates!

**WebWebWebs** lets you create a web server with APIs ***SUPER EASILY*** in just a few lines of code while also automatically getting free SSL certificates via [Let's Encrypt](https://www.letsencrypt.org) and renewing them.

Just set your **domain** and **e-mail** address, and a SSL certificate will be retrieved and automatically renewed 30 days before expiration with **ZERO DOWNTIME** without a restart of your server or connections.

*If you just need a web server without SSL certificates, check out the regular, zero-dependency [WebWebWeb](https://www.github.com/instafluff/WebWebWeb)!*

## Instafluff ##
> *Like these projects? The best way to support my open-source projects is by becoming a Comfy Sponsor on GitHub!*

> https://github.com/sponsors/instafluff

> *Come and hang out with us at the Comfiest Corner on Twitch!*

> https://twitch.tv/instafluff

## Requirements & Notes ##

### PORT 80 ###
Port 80 must be open and available so that ACME challenges can be successfully completed.

### Domain Name ###
The specified domain must point to the server running with **WebWebWebs**. Ensure you have created an A Record on your DNS to your server.

### No Response Error from Xfinity/Comcast ###
If you are running your server from Xfinity as your ISP and the ACME challenges are failing, you may need to turn off Advanced Security network settings on your account. Read [here](https://www.xfinity.com/support/articles/using-xfinity-xfi-advanced-security) for instructions on how to turn this setting off.

## Instructions ##

1. Install `webwebwebs`
```
npm install webwebwebs --save
```

2. Start the server on a port (e.g. 443 for HTTPS). Any HTML pages (e.g. index.html) can be placed in the root directory `/` and static files (e.g. images, scripts, and other HTML pages) can go into `/web` or `/public` and it will be served automagically
```javascript
var ComfyWeb = require( "webwebwebs" );
ComfyWeb.Run( 443, {
    domain: "webwebwebs.instafluff.tv",
    email: "waa@instafluff.tv"
} );
```

3. (Optional) Add APIs
```javascript
var ComfyWeb = require( "webwebwebs" );
ComfyWeb.APIs[ "/" ] = ( qs, body, opts ) => {
  return { "test": "example!" };
};
ComfyWeb.Run( 443, {
    domain: "webwebweb.instafluff.tv",
    email: "waa@instafluff.tv"
} );
```

### Options ###

The `Run()` function in **WebWebWebs** accepts several optional parameters:
- useCORS (default: true)
- test (default: false)

## Testing Certificates (Staging) ##
To use the **Staging** environment to test certificates with [Let's Encrypt](https://www.letsencrypt.org), enable the `test` parameter.
```javascript
var ComfyWeb = require( "webwebwebs" );
ComfyWeb.Run( 443, {
    test: true,
    domain: "webwebweb.instafluff.tv",
    email: "waa@instafluff.tv"
} );
```

## Handling POST/PUT/DELETE requests ##
All request methods are sent to the API handler. You can check the `opts.req.method` value to response accordingly and parse the body object for data.
```javascript
var ComfyWeb = require( "webwebwebs" );
ComfyWeb.APIs[ "/account" ] = ( qs, body, opts ) => {
    switch( opts.req.method ) {
        case "GET":
            return { "account": "test" };
        case "POST":
            return JSON.parse( body );
        case "PUT":
            return { "status": "updated" };
        case "DELETE":
            return {};
    }
};
ComfyWeb.Run( 443, {
    domain: "webwebweb.instafluff.tv",
    email: "waa@instafluff.tv"
} );
```

## Reading Request Headers ##
The request object is passed in to the API handler. You can check for header values in `opts.req.headers`.
```javascript
var ComfyWeb = require( "webwebwebs" );
ComfyWeb.APIs[ "/" ] = ( qs, body, opts ) => {
    return opts.req.headers;
};
ComfyWeb.Run( 443, {
    domain: "webwebweb.instafluff.tv",
    email: "waa@instafluff.tv"
} );
```

## Enabling CORS ##
Actually, CORS is enabled by default. To disable CORS, set the `useCORS` parameter:
```javascript
var ComfyWeb = require( "webwebwebs" );
ComfyWeb.Run( 443, {
    useCORS: false,
    domain: "webwebweb.instafluff.tv",
    email: "waa@instafluff.tv"
} );
```
