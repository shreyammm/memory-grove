import {defineConfig} from 'vite';
export default defineConfig({
  build:{outDir:'dist',emptyOutDir:false,target:'es2022',
    lib:{entry:'transcribe-entry.js',formats:['es'],fileName:()=> 'transcriber.js'},
    rollupOptions:{output:{assetFileNames:'ai-assets/[name]-[hash][extname]',chunkFileNames:'ai-assets/[name]-[hash].js'}}
  }
});
