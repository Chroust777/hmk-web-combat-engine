import fs from 'node:fs';
import {GM_COLOR} from '../src/integration/hmk-chat-store.js?v=94.105';
if (GM_COLOR !== '#e7cfa9') throw new Error('Chat was not reverted to v94.103 GM color');
const atlasCss = fs.readFileSync(new URL('../atlas.css', import.meta.url), 'utf8');
if (!atlasCss.includes('.shell-atlas .atlas-workspace{border:0!important;background:none!important;box-shadow:none!important}')) throw new Error('Atlas rear-panel override missing');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
if (!indexHtml.includes('./atlas.css?v=94.105') || !indexHtml.includes('./chat.css?v=94.105')) throw new Error('Cache-busting CSS versions not updated');
console.log('PASS test_94105_chat_atlas');
