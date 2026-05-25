import type { PromptRecord } from '../services/types.js';

export const PROMPT_SAMPLES: PromptRecord[] = [
  {
    id: 'civ-sample-001',
    answer: 'dragon',
    title: 'Obsidian dragon raid',
    prompt: 'obsidian dragon erupting from a ruined gothic cathedral, molten cracks across black scales, cinematic dark fantasy, dramatic rim lighting, volumetric smoke, hyper detailed, high contrast, epic composition',
    negativePrompt: 'nsfw, nude, naked, gore, disfigured, low quality, blurry, text, watermark',
    tags: ['fantasy', 'creature', 'cinematic'],
    source: 'civitai-cache-sample',
    nsfw: false,
    modelHint: 'SDXL cinematic fantasy model',
    qualityScore: 94
  },
  {
    id: 'civ-sample-002',
    answer: 'robot',
    title: 'Street food robot',
    prompt: 'friendly retro robot cooking noodles in a tiny neon street stall, rainy cyberpunk alley, steam, reflective pavement, expressive mechanical eyes, cozy atmosphere, cinematic lighting, highly detailed',
    negativePrompt: 'nsfw, nude, naked, low quality, blurry, extra limbs, malformed hands, watermark',
    tags: ['sci-fi', 'cyberpunk', 'character'],
    source: 'civitai-cache-sample',
    nsfw: false,
    modelHint: 'SDXL stylized realistic model',
    qualityScore: 91
  },
  {
    id: 'civ-sample-003',
    answer: 'castle',
    title: 'Gravity-defying castle',
    prompt: 'impossible floating castle built from white limestone and brass bridges, waterfalls spilling into clouds, sunrise over a fractured mountain range, painterly realism, grand scale, atmospheric perspective',
    negativePrompt: 'nsfw, nude, naked, low quality, blurry, cropped, text, watermark',
    tags: ['architecture', 'fantasy', 'landscape'],
    source: 'civitai-cache-sample',
    nsfw: false,
    modelHint: 'SDXL fantasy landscape model',
    qualityScore: 89
  },
  {
    id: 'civ-sample-004',
    answer: 'astronaut',
    title: 'Lost astronaut market',
    prompt: 'lonely astronaut exploring an ancient desert bazaar at night, glowing alien spices, nomad merchants, soft lantern light, dusty atmosphere, surreal science fiction, detailed fabrics and reflections',
    negativePrompt: 'nsfw, nude, naked, low quality, blurry, bad anatomy, watermark',
    tags: ['sci-fi', 'surreal', 'adventure'],
    source: 'civitai-cache-sample',
    nsfw: false,
    modelHint: 'SDXL sci-fi editorial model',
    qualityScore: 93
  },
  {
    id: 'civ-sample-005',
    answer: 'fox',
    title: 'Glass forest fox',
    prompt: 'small red fox walking through a forest made of translucent glass leaves, moonlight refractions, magical realism, delicate fur detail, shallow depth of field, dreamy but sharp, ethereal atmosphere',
    negativePrompt: 'nsfw, nude, naked, low quality, blurry, duplicate animal, deformed, watermark',
    tags: ['animal', 'magical', 'cinematic'],
    source: 'civitai-cache-sample',
    nsfw: false,
    modelHint: 'SDXL magical realism model',
    qualityScore: 90
  },
  {
    id: 'civ-sample-006',
    answer: 'train',
    title: 'Clockwork midnight train',
    prompt: 'clockwork train crossing a suspended bridge above a sleeping city, brass gears, midnight mist, glowing windows, steampunk noir, wide cinematic view, intricate mechanical details',
    negativePrompt: 'nsfw, nude, naked, low quality, blurry, bad perspective, watermark, text',
    tags: ['vehicle', 'steampunk', 'city'],
    source: 'civitai-cache-sample',
    nsfw: false,
    modelHint: 'SDXL steampunk environment model',
    qualityScore: 88
  }
];
