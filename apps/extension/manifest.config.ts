import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: "Select text and ask AI.",
  permissions: ['storage', 'activeTab', 'scripting'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.tsx'],
      all_frames: true,
      match_about_blank: true,
      run_at: 'document_end',
    },
  ],
  action: {
    default_popup: 'index.html',
    default_icon: {
      '16': 'public/icon.png',
      '48': 'public/icon.png',
      '128': 'public/icon.png',
    },
  },
  icons: {
    '16': 'public/icon.png',
    '48': 'public/icon.png',
    '128': 'public/icon.png',
  },
  web_accessible_resources: [
    {
      // src only needed for dev not prod
      resources: ['assets/*', 'vendor/*', 'src/*'],
      matches: ['<all_urls>'],
    },
  ],
});

