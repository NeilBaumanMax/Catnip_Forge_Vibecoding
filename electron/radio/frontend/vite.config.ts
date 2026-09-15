import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({plugins:[],root:'app',publicDir:'../public',base:'./',build:{outDir:'../dist',emptyOutDir:true,rollupOptions:{input:{index:resolve(import.meta.dirname,'app/index.html'),assembly:resolve(import.meta.dirname,'app/assembly.html')}}}});
