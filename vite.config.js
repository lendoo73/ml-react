import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const faceMaskImagesModuleId = 'virtual:face-mask-bad-mask-images';
const resolvedFaceMaskImagesModuleId = `\0${faceMaskImagesModuleId}`;
const supportedImageExtension = /\.(avif|gif|jpe?g|png|webp)$/i;

const faceMaskImages = () => {
    let imageDirectory;
    let devServer;

    const getImageUrls = () => readdirSync(imageDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && supportedImageExtension.test(entry.name))
        .map((entry) => `/images/face-mask/bad-mask/${encodeURIComponent(entry.name)}`)
        .sort();

    const reloadManifest = (changedPath) => {
        if (!resolve(changedPath).startsWith(imageDirectory)) return;
        const manifestModule = devServer.moduleGraph.getModuleById(resolvedFaceMaskImagesModuleId);
        if (manifestModule) devServer.moduleGraph.invalidateModule(manifestModule);
        devServer.ws.send({ type: 'full-reload' });
    };

    return {
        name: 'face-mask-preview-images',
        configResolved(config) {
            imageDirectory = resolve(config.publicDir, 'images/face-mask/bad-mask');
        },
        configureServer(server) {
            devServer = server;
            server.watcher.add(imageDirectory);
            server.watcher.on('add', reloadManifest);
            server.watcher.on('unlink', reloadManifest);
        },
        resolveId(id) {
            return id === faceMaskImagesModuleId ? resolvedFaceMaskImagesModuleId : null;
        },
        load(id) {
            if (id !== resolvedFaceMaskImagesModuleId) return null;
            return `export default ${JSON.stringify(getImageUrls())};`;
        },
    };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      react(),
      tailwindcss(),
      faceMaskImages(),
  ],
})
