/* a light layer on top of solid-cli, giving it persistant 
 * sessions and making it conform to the same API as 
 * solid-auth-client
 */

"use strict";

// import * as ifetch          from 'isomorphic-fetch';
// import * as filefetch       from 'solid-rest-file';
// import * as SolidClient     from '@solid/cli/src/SolidClient';
// import * as IdentityManager from '@solid/cli/src/IdentityManager';
// import * as fs              from 'fs';
// import * as path            from 'path';

// cjs-start
const ifetch          = require('isomorphic-fetch');
const filefetch       = require('solid-rest-file');
const SolidClient     = require('@solid/cli/src/SolidClient');
const IdentityManager =require('@solid/cli/src/IdentityManager');
const fs = require('fs');
const path = require('path');
exports.name = "cli";
exports.fetch = fetch;
exports.currentSession = currentSession;
exports.login = login;
exports.logout = logout;
exports.getCredentials = getCredentials;
// cjs-end

var session;
const idMan = new IdentityManager()
const client = new SolidClient({ identityManager : new IdentityManager() });

/*cjs*/ async function fetch(url,request){
    if( url.match(/^file:/) ){
        /* More robust support for file:// scheme is coming soon
           including support for all rdflib fetcher methods
        */
        return await filefetch(url,request)        
    }
    request = request || {};
    request.method = request.method || 'GET';
    request.headers = request.headers || {};
    if( session ) {
         let token = await client.createToken(url, session);
         request.credentials = "include";
         request.headers.authorization= `Bearer ${token}`;
    }
    return await ifetch(url,request);
}
/* 
 *  RATHER MINIMAL, BUT FOR NOW THEY"LL DO
 */
/*cjs*/ async function logout() {
    session = undefined;    
    return(1);
}
/*cjs*/ async function currentSession(){
    if (session && !client.isExpired(session))
        return(session)
    else { return null; }
}
/*cjs*/ async function login( cfg ) {
        if( typeof cfg==="string" ) cfg=undefined // s-a-client compatability 
        cfg = cfg || await getCredentials()
        if(typeof cfg.password === "undefined"){
            throw new Error("Couldn't find login config, please specify environment variables SOLID_IDP, SOLID_USERNAME, and SOLID_PASSWORD or see the README for solid-auth-cli for other login options.");
        }
        session = await client.login(
            cfg.idp,{username:cfg.username,password:cfg.password}
        )
        if(session) {
            session.webId = session.idClaims.sub
            return(session);
        }
        else { throw new Error("could not log in") }
}
/*cjs*/ async function getCredentials(fn){
        fn = fn || path.join(process.env.HOME,".solid-auth-cli-config.json")
        var creds={};
        if(fs.existsSync(fn))  {
            try {
                creds = fs.readFileSync(fn,'utf8');
            } catch(err) { throw new Error("read file error "+err) }
            try {
                creds = JSON.parse( creds );
                if(!creds) throw new Error("JSON parse error : "+err)
            } catch(err) { throw new Error("JSON parse error : "+err) }
        }
        else {
            creds = {
                idp      : process.env.SOLID_IDP,
                username : process.env.SOLID_USERNAME,
                password : process.env.SOLID_PASSWORD
            } 
        }
        return(creds)
}
