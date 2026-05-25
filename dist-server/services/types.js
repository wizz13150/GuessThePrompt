export const FLUX2_KLEIN_AIR = 'urn:air:flux2:checkpoint:civitai:2322332@2612554';
export const FLUX_KREA_DEV_AIR = 'urn:air:fluxkrea:checkpoint:civitai:618692@2068000';
export const SDXL_AIR = 'urn:air:sdxl:checkpoint:civitai:101055@128078';
export const Z_IMAGE_TURBO_AIR = 'urn:air:zimageturbo:checkpoint:civitai:2168935@2442439';
export const DEFAULT_MODEL_AIR = SDXL_AIR;
export const MODEL_PRESETS = [
    {
        id: 'flux2-klein-9b',
        label: 'Flux.2 Klein 9B',
        air: FLUX2_KLEIN_AIR,
        description: 'Flux.2 Klein 9B preset. Uses 8 steps. CFG and negative prompt are disabled for this preset while the Civitai workflow is stabilized.',
        fixedSteps: 8,
        fixedCfgScale: null
    },
    {
        id: 'flux-krea-dev',
        label: 'Flux.1 Krea Dev',
        air: FLUX_KREA_DEV_AIR,
        description: 'Flux.1 Krea Dev preset for Krea-style prompt interpretation and modern image generation.'
    },
    {
        id: 'sdxl-base',
        label: 'SDXL · default',
        air: SDXL_AIR,
        description: 'Default SDXL checkpoint preset for broad compatibility. Uses 28 steps, CFG 5, and supports negative prompt.'
    },
    {
        id: 'z-image-turbo',
        label: 'Z-Image Turbo',
        air: Z_IMAGE_TURBO_AIR,
        description: 'Z-Image Turbo preset for fast alternative image generation when available in Civitai Generator. Steps are fixed to 9 and CFG is fixed to 1.',
        fixedSteps: 9,
        fixedCfgScale: 1
    },
    {
        id: 'custom-air',
        label: 'Custom checkpoint AIR URN',
        air: '',
        description: 'Paste any compatible Civitai Generator checkpoint AIR URN.'
    }
];
export const DEFAULT_GENERATION_SETTINGS = {
    modelPreset: 'sdxl-base',
    modelAir: DEFAULT_MODEL_AIR,
    width: 1024,
    height: 1024,
    steps: 28,
    cfgScale: 5,
    batch: 1,
    seed: null,
    negativePromptExtra: '',
    loras: []
};
