import * as THREE from 'three';
import GalleryThemes from './GalleryThemes';

class AssetLoadingManager {
  constructor(onProgress, onComplete, onError) {
    this.loadingManager = new THREE.LoadingManager(
      onComplete,
      onProgress,
      onError
    );
    
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
  }

  //  --> Aims to fix some preloading of general stuff
  /**
   * Load artworks from JSON file
   */
  async loadArtworksJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.artworks || [];
    } catch (error) {
      console.error('Failed to load artworks JSON:', error);
      return [];
    }
  }

  /**
   * Load a single texture
   */
  loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Configure texture for best quality
          texture.anisotropy = 16;
          texture.generateMipmaps = true;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,  // onProgress (handled by LoadingManager)
        (error) => {
          console.error(`Failed to load texture: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load default textures for a theme
   */
  async loadThemeTextures(themeName) {
    console.log(`Loading theme textures for: ${themeName}`);
    
    const theme = GalleryThemes[themeName];
    if (!theme) {
      console.warn(`Theme '${themeName}' not found`);
      return {};
    }

    if (!theme.textures || !theme.textures.defaultPaths) {
      console.log(`Theme '${themeName}' has no default textures`);
      return {};
    }

    const textures = {};
    const paths = theme.textures.defaultPaths;

    // Load wall texture
    if (paths.wall) {
      try {
        console.log(`Loading theme wall texture: ${paths.wall}`);
        textures.wall = await this.loadTexture(paths.wall);
        console.log('✅ Theme wall texture loaded');
      } catch (error) {
        console.warn(`Failed to load theme wall texture: ${error.message}`);
      }
    }

    // Load floor texture
    if (paths.floor) {
      try {
        console.log(`Loading theme floor texture: ${paths.floor}`);
        textures.floor = await this.loadTexture(paths.floor);
        console.log('✅ Theme floor texture loaded');
      } catch (error) {
        console.warn(`Failed to load theme floor texture: ${error.message}`);
      }
    }

    // Load ceiling texture
    if (paths.ceiling) {
      try {
        console.log(`Loading theme ceiling texture: ${paths.ceiling}`);
        textures.ceiling = await this.loadTexture(paths.ceiling);
        console.log('✅ Theme ceiling texture loaded');
      } catch (error) {
        console.warn(`Failed to load theme ceiling texture: ${error.message}`);
      }
    }

    return textures;
  }

  /**
   * Preload artwork images
   * Forces browser to download images before they're needed
   */
  async preloadArtworkImages(artworks) {
    if (!artworks || artworks.length === 0) {
      console.log('No artworks to preload');
      return;
    }

    console.log(`Preloading ${artworks.length} artwork images...`);

    const imagePromises = artworks.map((artwork) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          console.log(`✅ Preloaded: ${artwork.title}`);
          resolve();
        };
        
        img.onerror = (error) => {
          console.warn(`⚠️ Failed to preload: ${artwork.title}`, error);
          resolve();  // Resolve anyway to not block other images
        };
        
        img.src = artwork.image_url;
      });
    });

    try {
      await Promise.all(imagePromises);
      console.log('✅ All artwork images preloaded');
    } catch (error) {
      console.error('Error preloading artwork images:', error);
    }
  }

  /**
   * Load all assets with optional theme textures
   */
  async loadAllAssets(config) {
    const assets = { artworks: [], textures: {} };

    // Load artworks JSON
    if (config.artworksJsonUrl) {
      assets.artworks = await this.loadArtworksJSON(config.artworksJsonUrl);
      console.log(`Loaded ${assets.artworks.length} artworks from JSON`);
    }

    // PRIORITY 1: Load custom textures (user provided)
    if (config.textures) {
      if (config.textures.wall) {
        console.log('Loading custom wall texture...');
        assets.textures.wall = await this.loadTexture(config.textures.wall);
      }
      if (config.textures.floor) {
        console.log('Loading custom floor texture...');
        assets.textures.floor = await this.loadTexture(config.textures.floor);
      }
      if (config.textures.ceiling) {
        console.log('Loading custom ceiling texture...');
        assets.textures.ceiling = await this.loadTexture(config.textures.ceiling);
      }
    }

    // PRIORITY 2: Load theme textures as fallback (if enabled)
    if (config.useThemeTextures && config.theme) {
      const themeTextures = await this.loadThemeTextures(config.theme);
      
      // Only use theme texture if user didn't provide custom one
      if (!assets.textures.wall && themeTextures.wall) {
        assets.textures.wall = themeTextures.wall;
        console.log('Using theme wall texture');
      }
      if (!assets.textures.floor && themeTextures.floor) {
        assets.textures.floor = themeTextures.floor;
        console.log('Using theme floor texture');
      }
      if (!assets.textures.ceiling && themeTextures.ceiling) {
        assets.textures.ceiling = themeTextures.ceiling;
        console.log('Using theme ceiling texture');
      }
    }

    // Preload artwork images
    if (config.preloadArtworkImages) {
      await this.preloadArtworkImages(assets.artworks);
    }

    console.log('All assets loaded:', {
      artworks: assets.artworks.length,
      textures: Object.keys(assets.textures)
    });

    return assets;
  }
}

export default AssetLoadingManager;
