import * as THREE from 'three';
import ArtworkLabels from './ArtworkLabels';

// Artwork Loader

class ArtworkLoader {
  constructor() {
    this.artworks = [];
    this.artworkMeshes = [];
    this.textureLoader = new THREE.TextureLoader();
    this.labels = []; // Store label meshes
  }

  /**
   * Load artworks from JSON file
   */
  async loadFromJSON(jsonPath) {
    try {
      const response = await fetch(jsonPath);
      const data = await response.json();
      this.artworks = data.artworks;
      console.log(`Loaded ${this.artworks.length} artworks from JSON`);
      return this.artworks;
    } catch (error) {
      console.error('Error loading artworks JSON:', error);
      return [];
    }
  }

  // place artworks in scene based on art placement data
  placeArtworks(scene, artworkPlacements, options = {}) {
    const placedArtworks = [];
    const showLabels = options.showLabels !== false; // Default true
    const labelStyle = options.labelStyle || 'side'; // 'side', 'bottom', or 'verbose'

    for (const placement of artworkPlacements) {
      const artwork = this.artworks[placement.artworkId];
      
      if (!artwork) {
        console.warn(`No artwork found for ID ${placement.artworkId}`);
        continue;
      }

      const artworkMesh = this.createArtworkPlane(artwork, placement);
      scene.add(artworkMesh);
      this.artworkMeshes.push(artworkMesh);

      // Declare label outside if block
      let label = null;

      // Add label if enabled
      if (showLabels) {
        if (labelStyle === 'side') {
          label = ArtworkLabels.createSidePlaque(artwork, artworkMesh);
        } else if (labelStyle === 'bottom') {
          label = ArtworkLabels.createLabel(artwork, artworkMesh, {
            showDescription: options.showDescription || false
          });
        } else if (labelStyle === 'verbose') {
          label = ArtworkLabels.createVerboseLabel(artwork, artworkMesh, options);
        }
        
        if (label) {
          scene.add(label);
          this.labels.push(label);
        }
      }

      placedArtworks.push({
        mesh: artworkMesh,
        data: artwork,
        placement: placement,
        label: label  
      });
    }

    console.log(`Placed ${placedArtworks.length} artworks in gallery`);
    if (showLabels) {
      console.log(`Added ${this.labels.length} labels (${labelStyle} style)`);
    }
    return placedArtworks;
  }

  /**
   * Wait for all artwork textures to finish loading
   * Returns a promise that resolves when all textures are ready
   */
  async waitForTexturesLoaded() {
    return new Promise((resolve) => {
      let checksRemaining = 50; // Max 5 seconds (50 * 100ms)
      
      const checkInterval = setInterval(() => {
        checksRemaining--;
        
        // Check if all meshes have their textures loaded
        const allLoaded = this.artworkMeshes.every(mesh => {
          if (!mesh.material || !mesh.material.map) return false;
          // Check if texture has image data (means it's loaded)
          const hasImage = mesh.material.map.image;
          const isComplete = hasImage && (hasImage.complete || hasImage.naturalWidth > 0);
          return isComplete;
        });

        if (allLoaded) {
          clearInterval(checkInterval);
          console.log('All artwork textures loaded into memory');
          resolve(true);
        } else if (checksRemaining <= 0) {
          clearInterval(checkInterval);
          console.warn('Texture loading timeout - proceeding anyway');
          resolve(false);
        }
      }, 100); // Check every 100ms
    });
  }

  // Creates material plane for artwork
  createArtworkPlane(artwork, placement) {
    const width = artwork.width || 2.5;
    const height = artwork.height || 2.0;

    // Create geometry for the artwork
    const geometry = new THREE.PlaneGeometry(width, height);

    // Load texture or use placeholder
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Load actual texture
    this.textureLoader.load(
      artwork.image_url,
      (texture) => {
        // Configure texture for optimal performance
        texture.anisotropy = 16;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true; // Force immediate upload
        
        material.map = texture;
        material.needsUpdate = true; // Force material update
      },
      undefined,
      (error) => {
        console.warn(`Failed to load texture for ${artwork.title}:`, error);
        // Use colored placeholder on error
        material.color.setHex(this.getPlaceholderColor(artwork.id));
      }
    );

    const mesh = new THREE.Mesh(geometry, material);

    // Position the artwork
    mesh.position.copy(placement.position);
    mesh.rotation.copy(placement.rotation);

    // Add frame 
    const frame = this.createFrame(width, height);
    mesh.add(frame);

    // Store artwork data in mesh for later interaction
    mesh.userData = {
      artworkId: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      description: artwork.description,
      isArtwork: true
    };

    return mesh;
  }

  // Art frame creator
  createFrame(width, height) {
    const frameThickness = 0.1;
    const frameDepth = 0.05;
    const frameColor = 0x4a3728; // Dark wood color

    const frameGroup = new THREE.Group();
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: frameColor,
      roughness: 0.7,
      metalness: 0.3,
    });

    // Top bar
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    topBar.position.set(0, height / 2 + frameThickness / 2, -frameDepth / 2);
    frameGroup.add(topBar);

    // Bottom bar
    const bottomBar = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    bottomBar.position.set(0, -height / 2 - frameThickness / 2, -frameDepth / 2);
    frameGroup.add(bottomBar);

    // Left bar
    const leftBar = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height, frameDepth),
      frameMaterial
    );
    leftBar.position.set(-width / 2 - frameThickness / 2, 0, -frameDepth / 2);
    frameGroup.add(leftBar);

    // Right bar
    const rightBar = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height, frameDepth),
      frameMaterial
    );
    rightBar.position.set(width / 2 + frameThickness / 2, 0, -frameDepth / 2);
    frameGroup.add(rightBar);

    return frameGroup;
  }

  // Placeholder colors for different art
  getPlaceholderColor(id) {
    const colors = [
      0xff6b6b, // Red
      0x4ecdc4, // Teal
      0xffe66d, // Yellow
      0x95e1d3, // Mint
      0xf38181, // Pink
      0xaa96da, // Purple
      0xfcbad3, // Light pink
      0xa8e6cf, // Light green
    ];
    return colors[id % colors.length];
  }

  // Info labels for artwork
  createInfoLabel(artwork, position) {
    // Create a canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;

    // Draw text
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.font = 'Bold 32px Arial';
    context.fillText(artwork.title, 20, 50);
    context.font = '24px Arial';
    context.fillText(artwork.artist, 20, 90);
    context.fillText(`${artwork.year}`, 20, 130);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const geometry = new THREE.PlaneGeometry(1, 0.5);
    const label = new THREE.Mesh(geometry, material);

    label.position.copy(position);
    label.position.y -= 1.5; // Below artwork

    return label;
  }
  
  // Get artwork via mesh id
  getArtworkById(id) {
    return this.artworkMeshes.find(mesh => mesh.userData.artworkId === id);
  }

  // Cleanup
  dispose() {
    this.artworkMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
      if (mesh.material?.map) mesh.material.map.dispose();
    });
    this.artworkMeshes = [];
  }
}

export default ArtworkLoader;
