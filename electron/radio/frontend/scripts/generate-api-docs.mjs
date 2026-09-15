import {writeFile} from 'node:fs/promises';
import {commandSchemas} from '../shared/commands.js';
const json=schema=>({'application/json':{schema}});
const object={type:'object',additionalProperties:true};
const response=(description,schema=object)=>({description,content:json(schema)});
const auth=[{sessionToken:[]}];
const sid={name:'sessionId',in:'path',required:true,schema:{type:'string',format:'uuid'}};
const cid={name:'commandId',in:'path',required:true,schema:{type:'string',format:'uuid'}};
const paths={
 '/api/v1/health':{get:{operationId:'health',responses:{200:response('Service availability')}}},
 '/api/v1/capabilities':{get:{operationId:'capabilities',responses:{200:response('Complete command schemas and limits')}}},
 '/api/v1/sessions':{post:{operationId:'createSession',description:'Create an isolated one-hour session. Open browserUrl and click Allow Agent. Keep returned token secret.',requestBody:{required:true,content:json({type:'object'})},responses:{201:response('Created',{type:'object',properties:{id:{type:'string'},token:{type:'string'},browserUrl:{type:'string',format:'uri'},expiresAt:{type:'number'}}}),503:response('Capacity reached')}}},
 '/api/v1/sessions/{sessionId}':{delete:{operationId:'closeSession',parameters:[sid],security:auth,responses:{200:response('Closed'),401:response('Invalid token'),404:response('Expired session')}}},
 '/api/v1/sessions/{sessionId}/state':{get:{operationId:'getState',parameters:[sid],security:auth,responses:{200:response('Last browser observation; inspect connected and observedAt. Null state until pairing.'),401:response('Invalid token'),404:response('Expired session')}}},
 '/api/v1/sessions/{sessionId}/commands':{post:{operationId:'executeCommand',parameters:[sid,{name:'Idempotency-Key',in:'header',schema:{type:'string',maxLength:128}}],security:auth,requestBody:{required:true,content:json({oneOf:Object.entries(commandSchemas).map(([type,params])=>({type:'object',required:params.required.length?['type','params']:['type'],additionalProperties:false,properties:{type:{type:'string',enum:[type]},params}}))})},responses:{202:response('Queued, not yet applied'),200:response('Idempotent retry'),400:response('Invalid command'),401:response('Invalid token'),409:response('Browser disconnected or idempotency conflict'),429:response('Queue or rate limit')}}},
 '/api/v1/sessions/{sessionId}/commands/{commandId}':{get:{operationId:'getCommandResult',parameters:[sid,cid],security:auth,responses:{200:response('status: queued, dispatched, applied, failed, expired. Applied means command handled, not motion completed. Snapshot returns result.image data URL.'),401:response('Invalid token'),404:response('Missing or evicted result')}}}
};
await writeFile(new URL('../public/openapi.json',import.meta.url),JSON.stringify({openapi:'3.1.0',info:{title:'Forge Robot Simulation Agent API',version:'1.0.0',description:'Simulation only. Paired live browser required. Existing mouse UI stays active.'},servers:[{url:'https://model.zhiforge.org'},{url:'http://127.0.0.1:5182'}],paths,components:{securitySchemes:{sessionToken:{type:'http',scheme:'bearer',description:'Per-session agent token from createSession; never reuse browser pairing credential.'}}}},null,2)+'\n');
console.log('Generated public/openapi.json from shared command schemas');
