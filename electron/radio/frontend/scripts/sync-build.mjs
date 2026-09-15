import {cp} from 'node:fs/promises';
for(const entry of ['index.html','assembly.html','assets','models','faces','art','agent.md','openapi.json','llms.txt','skills','_headers'])await cp(new URL('../dist/'+entry,import.meta.url),new URL('../'+entry,import.meta.url),{recursive:true});
console.log('Updated root static deployment from dist; existing unrelated files preserved.');
