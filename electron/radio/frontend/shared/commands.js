// Shared, dependency-free contract: imported by HTTP service and browser.
const number=(minimum,maximum)=>({type:'number',minimum,maximum});
const choice=(...values)=>({type:'string',enum:values});
const boolean={type:'boolean'};
const color={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
const spec=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
export const commandSchemas={
 'pose.set':spec({ll:number(0,180),rl:number(0,180),lf:number(0,180),rf:number(0,180)}),
 'colors.set':spec({shell:color,body:color,limbs:color}),
 'model.set':spec({model:choice('a','b')},['model']),
 'mount.set':spec({shellHeight:number(20,100),shellDepth:number(-60,60),shellYaw:number(-180,180),bodyDepth:number(-20,20),explode:number(0,1)}),
 'assembly.view':spec({inspect:choice('assembly','shell','body','leg','foot','grip'),shell:boolean,body:boolean,screen:boolean,grip:boolean,axes:boolean,transparent:boolean}),
 'view.set':spec({view:choice('front','side','back','fit'),rotate:boolean,wireframe:boolean}),
 'motion.play':spec({name:choice('walk','turn','jump','swing','moonwalk','bend','shake','updown','tiptoe','jitter','ascending','crusaito','flapping'),period:{...number(500,1500),multipleOf:10},steps:{...number(1,100),multipleOf:1},height:{...number(0,170),multipleOf:1},direction:{type:'number',enum:[-1,1]},speed:{...number(.3,2),multipleOf:.1}},['name']),
 'motion.pause':spec(), 'motion.home':spec(),
 'screen.js':spec({code:{type:'string',minLength:1,maxLength:100000}},['code']),
 'screen.gif':spec({face:choice('neutral','happy','laughing','confused','sleepy','angry')},['face']),
 'screen.stop':spec(), 'snapshot':spec()
};
export function validateCommand(command){
 if(!command||typeof command!=='object'||Array.isArray(command))throw Error('Command must be an object');
 if(Object.keys(command).some(k=>!['type','params'].includes(k)))throw Error('Unknown command field');
 if(!Object.hasOwn(commandSchemas,command.type))throw Error('Unknown command type');
 const schema=commandSchemas[command.type], params=command.params??{};
 if(!params||typeof params!=='object'||Array.isArray(params))throw Error('params must be an object');
 for(const key of schema.required)if(!Object.hasOwn(params,key))throw Error('Missing '+key);
 for(const [key,value] of Object.entries(params)){
  if(!Object.hasOwn(schema.properties,key))throw Error('Unknown parameter '+key);
  const rule=schema.properties[key];
  if(typeof value!==rule.type)throw Error('Invalid type for '+key);
  if(rule.type==='number'&&(!Number.isFinite(value)||value<rule.minimum||value>rule.maximum))throw Error('Out of range: '+key);
  if(rule.enum&&!rule.enum.includes(value))throw Error('Invalid value: '+key);
  if(rule.multipleOf&&Math.abs(value/rule.multipleOf-Math.round(value/rule.multipleOf))>1e-8)throw Error('Invalid step: '+key);
  if(rule.pattern&&!new RegExp(rule.pattern).test(value))throw Error('Invalid format: '+key);
  if(rule.type==='string'&&(value.length<(rule.minLength??0)||value.length>(rule.maxLength??Infinity)))throw Error('Invalid length: '+key);
 }
 return {type:command.type,params};
}
