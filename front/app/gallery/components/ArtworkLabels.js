import * as THREE from 'three';

/**
 * Artwork Label Creator
 * Adds title/description text below artworks
 */

class ArtworkLabels {
  /**
   * Create a text label canvas
   */
  static createLabelTexture(artwork, options = {}) {
    const canvasWidth = options.width || 512;
    const baseHeight = 170; // Height for title, artist, year
    const lineHeight = 24;
    const maxWidth = canvasWidth - 40;
    const padding = 20;

    // Calculate description height if needed
    let descriptionHeight = 0;
    let descriptionLines = [];
    
    if (artwork.description && options.showDescription) {
      // Create temporary canvas to measure text
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.font = '18px Arial, sans-serif';
      
      const words = artwork.description.split(' ');
      let line = '';
      
      for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = tempCtx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
          descriptionLines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line) {
        descriptionLines.push(line);
      }
      
      descriptionHeight = descriptionLines.length * lineHeight + padding;
    }

    // Create canvas with calculated height
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = baseHeight + descriptionHeight + padding;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = options.bgColor || '#f5f5f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle border
    ctx.strokeStyle = '#d0d0c8';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // Title
    ctx.fillStyle = '#2a2a2a';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(artwork.title, canvas.width / 2, 60);

    // Artist
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#5a5a5a';
    ctx.fillText(artwork.artist, canvas.width / 2, 100);

    // Year
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(String(artwork.year), canvas.width / 2, 130);

    // Description (pre-calculated lines)
    if (artwork.description && options.showDescription && descriptionLines.length > 0) {
      ctx.font = '18px Arial, sans-serif';
      ctx.fillStyle = '#6a6a6a';
      let y = 170;

      for (let line of descriptionLines) {
        ctx.fillText(line, canvas.width / 2, y);
        y += lineHeight;
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create a 3D label mesh
   */
  static createLabel(artwork, artworkMesh, options = {}) {
    const texture = this.createLabelTexture(artwork, options);
    
    const labelWidth = options.labelWidth || 1.5;
    
    // Calculate height based on canvas texture aspect ratio
    const canvasWidth = texture.image.width;
    const canvasHeight = texture.image.height;
    const aspectRatio = canvasHeight / canvasWidth;
    const labelHeight = labelWidth * aspectRatio;

    const geometry = new THREE.PlaneGeometry(labelWidth, labelHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const label = new THREE.Mesh(geometry, material);

    // Position below artwork
    label.position.copy(artworkMesh.position);
    label.rotation.copy(artworkMesh.rotation);
    
    // Offset downward
    const artworkHeight = artworkMesh.geometry.parameters.height;
    const offset = (artworkHeight / 2) + (labelHeight / 2) + 0.2;
    
    label.position.y -= offset;

    // Store reference
    label.userData.isLabel = true;
    label.userData.artworkId = artwork.id;

    return label;
  }

  /**
   * Create minimal side plaque (like real museums)
   */
  static createSidePlaque(artwork, artworkMesh, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Text
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(artwork.title, 20, 40);

    ctx.font = '20px Georgia, serif';
    ctx.fillStyle = '#4a4a4a';
    ctx.fillText(artwork.artist, 20, 70);
    
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillText(String(artwork.year), 20, 95);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(0.8, 0.3);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const plaque = new THREE.Mesh(geometry, material);

    // Position to the side of artwork
    plaque.position.copy(artworkMesh.position);
    plaque.rotation.copy(artworkMesh.rotation);

    // Offset to the right
    const artworkWidth = artworkMesh.geometry.parameters.width;
    const rightOffset = (artworkWidth / 2) + 0.5;

    // Calculate right direction
    const right = new THREE.Vector3(1, 0, 0);
    right.applyEuler(artworkMesh.rotation);
    
    plaque.position.x += right.x * rightOffset;
    plaque.position.z += right.z * rightOffset;
    plaque.position.y -= 0.3; // Slightly lower

    plaque.userData.isLabel = true;
    plaque.userData.artworkId = artwork.id;

    return plaque;
  }

  /**
   * Create verbose label (side plaque + description below)
   */
  static createVerboseLabel(artwork, artworkMesh, options = {}) {
    const group = new THREE.Group();

    // Create main plaque (title, artist, year)
    const plaque = this.createSidePlaque(artwork, artworkMesh, options);
    
    // Reset plaque position to origin (we'll position the group instead)
    const plaquePosition = plaque.position.clone();
    const plaqueRotation = plaque.rotation.clone();
    plaque.position.set(0.2, 0.15, 0); // Offset up within group
    plaque.rotation.set(0, 0, 0);
    
    group.add(plaque);

    // Create description label below if description exists
    if (artwork.description) {
      const descCanvas = document.createElement('canvas');
      const descWidth = 400;
      const lineHeight = 22;
      const padding = 20;
      const maxTextWidth = descWidth - 40;

      // Calculate description lines
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.font = '16px Georgia, serif';
      
      const words = artwork.description.split(' ');
      let line = '';
      const lines = [];
      
      for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = tempCtx.measureText(testLine);
        
        if (metrics.width > maxTextWidth && line !== '') {
          lines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line) {
        lines.push(line);
      }

      // Create canvas with calculated height
      const descHeight = (lines.length * lineHeight) + (padding * 2);
      descCanvas.width = descWidth;
      descCanvas.height = descHeight;
      const descCtx = descCanvas.getContext('2d');

      // White background
      descCtx.fillStyle = '#ffffff';
      descCtx.fillRect(0, 0, descCanvas.width, descCanvas.height);

      // Border
      descCtx.strokeStyle = '#e0e0e0';
      descCtx.lineWidth = 1;
      descCtx.strokeRect(2, 2, descCanvas.width - 4, descCanvas.height - 4);

      // Draw description text
      descCtx.fillStyle = '#1F1F1F';
      descCtx.font = '16px Georgia, serif';
      descCtx.textAlign = 'left';
      
      let y = padding + 16;
      for (let line of lines) {
        descCtx.fillText(line, 20, y);
        y += lineHeight;
      }

      const descTexture = new THREE.CanvasTexture(descCanvas);
      
      // Calculate geometry proportions
      const descLabelWidth = 0.8;
      const descAspectRatio = descCanvas.height / descCanvas.width;
      const descLabelHeight = descLabelWidth * descAspectRatio;
      
      const descGeometry = new THREE.PlaneGeometry(descLabelWidth, descLabelHeight);
      const descMaterial = new THREE.MeshBasicMaterial({
        map: descTexture,
        side: THREE.DoubleSide,
      });

      const descLabel = new THREE.Mesh(descGeometry, descMaterial);
      
      // Position below main plaque
      const verticalOffset = 0.1 + descLabelHeight / 2; // Plaque offset + half desc height + gap
      descLabel.position.set(0.2, -verticalOffset, 0);
      
      group.add(descLabel);
    }

    // Position the entire group
    group.position.copy(plaquePosition);
    group.rotation.copy(plaqueRotation);

    group.userData.isLabel = true;
    group.userData.artworkId = artwork.id;
    group.userData.isVerbose = true;

    return group;
  }
}

export default ArtworkLabels;
