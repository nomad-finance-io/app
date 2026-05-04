import { readFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { getRenderMapVisitor } from '@codama/renderers-js';
import { writeRenderMap } from '@codama/renderers-core';

const here = dirname(fileURLToPath(import.meta.url));
const idlPath = resolve(here, '../idl/nomad_amm.json');
const outDir = resolve(here, '../src/generated');

const idl = JSON.parse(readFileSync(idlPath, 'utf8'));
const codama = createFromRoot(rootNodeFromAnchor(idl));
const renderMap = codama.accept(getRenderMapVisitor());

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeRenderMap(renderMap, outDir);

console.log(`Generated ${renderMap.size} files at ${outDir}`);
