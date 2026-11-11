import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { env } from 'node:process';
export default defineConfig({base:env.VITE_BASE_PATH ?? '/',plugins:[react(),tailwindcss()],server:{fs:{strict:false},port:Number(env.VITE_PORT ?? 5173),strictPort:true,proxy:{'/api':env.VITE_API_TARGET ?? 'http://127.0.0.1:3001'}},build:{outDir:env.VITE_OUT_DIR ?? 'dist',chunkSizeWarningLimit:1800,rollupOptions:{output:{manualChunks:(id:string)=>id.includes('/phaser/')?'phaser':undefined}}}});
