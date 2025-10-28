
import * as THREE from 'three';

// Gallery Theme adder refer to the format to make one:

const GalleryThemes = {
  // LIMINAL :D
  liminal: {
    name: 'Liminal Spaces',
    colors: {
      background: 0xbfb6a5,
      fog: 0xF0ECDA,
      wall: 0xd4cbb8,
      floor: 0xc8bea8,
      ceiling: 0xd4cbb8,
    },
    lighting: {
      ambient: { color: 0xFCF9E1, intensity: 0.8 },
      ceiling: { color: 0xffe8b8, intensity: 0.3 },
    },
    textures: {
      wallRepeat: { u: 5, v: 5 },
      floorRepeat: { u: 5, v: 5 },
      ceilingRepeat: { u: 3, v: 3 },
      defaultPaths: {
        wall: '/textures/Wp01.jpg',
        floor: '/textures/Fr01.jpg',
        ceiling: '/textures/C01.png',
      }
    },
    materials: {
      wall: { roughness: 0.85, metalness: 0.1 },
      floor: { roughness: 0.7, metalness: 0.15 },
      ceiling: { roughness: 0.9, metalness: 0.05 },
    }
  },

  // BASIC STUFF
  warm: {
    name: 'Warm Traditional',
    colors: {
      background: 0xC4FFF2,
      fog: 0xC4FFF2,
      wall: 0xBFE7F2,
      floor: 0xc8b090,
      ceiling: 0xBFE7F2,
    },
    lighting: {
      ambient: { color: 0xC4FFF2, intensity: 0.6 },
      ceiling: { color: 0xffd699, intensity: 0.4 },
    },
    textures: {
      wallRepeat: { u: 2, v: 2 },
      floorRepeat: { u: 6, v: 6 },  
      ceilingRepeat: { u: 2, v: 2 },
      defaultPaths: {
        wall: null,
        floor: '/textures/Fr02.jpg',
        ceiling: null,
      }
    },
    materials: {
      wall: { roughness: 0.8, metalness: 0.1 },
      floor: { roughness: 0.6, metalness: 0.15 },
      ceiling: { roughness: 0.85, metalness: 0.1 },
    }
  },
};

/**
 * Calculate proper texture repeat based on wall dimensions
 */
function calculateTextureRepeat(width, height, baseRepeat) {
  // Base repeat assumes 10m x 5m wall
  const baseWidth = 10;
  const baseHeight = 5;
  
  // Scale repeat based on actual dimensions
  const uRepeat = (width / baseWidth) * baseRepeat.u;
  const vRepeat = (height / baseHeight) * baseRepeat.v;
  
  return { u: uRepeat, v: vRepeat };
}

/**
 * Apply texture to material with proper tiling for wall dimensions
 */
function applyTextureToMaterial(texture, material, wallWidth, wallHeight, theme, surface = 'wall') {
  if (!texture) return;
  
  const themeConfig = GalleryThemes[theme] || GalleryThemes.classic;
  const baseRepeat = themeConfig.textures[`${surface}Repeat`];
  
  // Calculate proper repeat for this specific wall size
  const repeat = calculateTextureRepeat(wallWidth, wallHeight, baseRepeat);
  
  // Clone texture for this specific wall (prevent shared state issues)
  const wallTexture = texture.clone();
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(repeat.u, repeat.v);
  wallTexture.needsUpdate = true;
  
  material.map = wallTexture;
  material.needsUpdate = true;
}

/**
 * Create material for a surface with theme settings
 */
function createThemedMaterial(theme, surface, texture = null) {
  const themeConfig = GalleryThemes[theme] || GalleryThemes.classic;
  const materialProps = themeConfig.materials[surface];
  const color = themeConfig.colors[surface];
  
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: materialProps.roughness,
    metalness: materialProps.metalness,
  });
  
  // If texture provided, it will be applied per-wall with proper tiling
  // Don't apply here to avoid shared texture issues
  
  return material;
}

/**
 * Get theme configuration
 */
function getTheme(themeName) {
  return GalleryThemes[themeName] || GalleryThemes.classic;
}

/**
 * List all available themes
 */
function listThemes() {
  return Object.keys(GalleryThemes).map(key => ({
    id: key,
    name: GalleryThemes[key].name
  }));
}

export default GalleryThemes;
export {
  calculateTextureRepeat,
  applyTextureToMaterial,
  createThemedMaterial,
  getTheme,
  listThemes
};
