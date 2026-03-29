import { dirname, resolve} from 'node:path'
import { fileURLToPath} from 'node:url'
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readdirSync, copyFileSync, mkdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url))

// Recursive directory copy function
function copyDirRecursive(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  readdirSync(src).forEach(file => {
    const srcFile = resolve(src, file);
    const destFile = resolve(dest, file);
    const stat = statSync(srcFile);
    if (stat.isDirectory()) {
      copyDirRecursive(srcFile, destFile);
    } else {
      copyFileSync(srcFile, destFile);
    }
  });
}

// Plugin to copy background scripts, locales, icons, and manifest to dist
function copyExtensionFilesPlugin(): Plugin {
  return {
    name: 'copy-extension-files',
    apply: 'build',
    writeBundle() {
      const srcDir = resolve(__dirname, 'src');
      const distDir = resolve(__dirname, 'dist');

      // Copy background scripts
      const bgScriptsDir = resolve(srcDir, 'background_scripts');
      const distBgScriptsDir = resolve(distDir, 'background_scripts');
      mkdirSync(distBgScriptsDir, { recursive: true });
      readdirSync(bgScriptsDir).forEach(file => {
        if (file.endsWith('.js')) {
          copyFileSync(
            resolve(bgScriptsDir, file),
            resolve(distBgScriptsDir, file)
          );
        }
      });

      // Generate browser-specific manifests
      const manifestPath = resolve(srcDir, 'manifest.json');
      const baseManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const browserTarget = process.env.BROWSER_TARGET ?? 'firefox';

      // Firefox manifest (with scripts array)
      writeFileSync(
        resolve(distDir, 'manifest.firefox.json'),
        JSON.stringify(baseManifest, null, 2)
      );

      // Chrome manifest (with service_worker)
      const chromeManifest = JSON.parse(JSON.stringify(baseManifest));
      if (chromeManifest.background?.scripts) {
        const scriptPath = chromeManifest.background.scripts[chromeManifest.background.scripts.length - 1];
        chromeManifest.background = {
          service_worker: scriptPath,
          type: 'module'
        };
      }
      writeFileSync(
        resolve(distDir, 'manifest.chrome.json'),
        JSON.stringify(chromeManifest, null, 2)
      );

      // Create default manifest.json based on BROWSER_TARGET (for local dev)
      const defaultManifest = browserTarget === 'chrome' ? chromeManifest : baseManifest;
      writeFileSync(
        resolve(distDir, 'manifest.json'),
        JSON.stringify(defaultManifest, null, 2)
      );

      // Copy _locales directory
      const localesDir = resolve(srcDir, '_locales');
      const distLocalesDir = resolve(distDir, '_locales');
      try {
        const stat = statSync(localesDir);
        if (stat.isDirectory()) {
          copyDirRecursive(localesDir, distLocalesDir);
        }
      } catch {
        // Directory doesn't exist yet, skip
      }

      // Copy icons directory to assets/icons
      const iconsDir = resolve(srcDir, 'icons');
      const distIconsDir = resolve(distDir, 'assets', 'icons');
      try {
        const stat = statSync(iconsDir);
        if (stat.isDirectory()) {
          copyDirRecursive(iconsDir, distIconsDir);
        }
      } catch {
        // Directory doesn't exist yet, skip
      }
    }
  };
}

export default defineConfig(() => ({
  root: "src",
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BROWSER_TARGET__: JSON.stringify(process.env.BROWSER_TARGET ?? 'firefox'),
  },
  plugins: [react(), copyExtensionFilesPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        demo: resolve(__dirname, 'src/index.html'),
        popup: resolve (__dirname , 'src/pages/popup/index.html'),
        settings: resolve (__dirname , 'src/pages/settings/index.html'),
        timeout: resolve (__dirname , 'src/pages/timeout/index.html'),
        info: resolve (__dirname , 'src/pages/info/index.html')
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
}));
