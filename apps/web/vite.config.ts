import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { env } from 'node:process';
export default defineConfig({plugins:[react(),tailwindcss()],server:{fs:{strict:false},port:Number(env.VITE_PORT ?? 5173),strictPort:true,proxy:{'/api':env.VITE_API_TARGET ?? 'http://127.0.0.1:3001'}},build:{chunkSizeWarningLimit:1800,rollupOptions:{output:{manualChunks:(id:string)=>id.includes('/phaser/')?'phaser':undefined}}}});
