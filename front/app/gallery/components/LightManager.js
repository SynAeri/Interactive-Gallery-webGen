import * as THREE from 'three';

// Lighting setter

class LightManager {
  constructor(scene, camera, options = {}) {
    this.scene = scene;
    this.camera = camera;
    
    // Color Setter
    this.colors = {
      background: options.backgroundColor || 0xbfb6a5,  
      fog: options.fogColor || 0xd2cbb8,               
      ambient: options.ambientColor || 0xfff4e6,       
      fluorescent: options.fluorescentColor || 0xfffef2,
    };
    
    this.fogDensity = options.fogDensity || { near: 5, far: 60 };
    this.bloomIntensity = options.bloomIntensity || 0.3;
    
    this.dustParticles = null;
    this.volumetricLayers = [];
  }

  // Initialize lighting setup //
  setupLighting() {
    
    this.scene.background = new THREE.Color(this.colors.background);
    this.scene.fog = new THREE.Fog(
      this.colors.fog,
      this.fogDensity.near,
      this.fogDensity.far
    );

    // Soft ambient light (dreamcore - no harsh shadows)
    const ambientLight = new THREE.AmbientLight(this.colors.ambient, 0.6);
    this.scene.add(ambientLight);

    // Soft directional light (overhead fluorescent feel)
    const mainLight = new THREE.DirectionalLight(this.colors.fluorescent, 0.4);
    mainLight.position.set(0, 10, 0);
    mainLight.castShadow = false; // No harsh shadows
    this.scene.add(mainLight);

    // Add subtle hemisphere light for that "between" feeling
    const hemiLight = new THREE.HemisphereLight(
      0xfff9e6, // Sky color (warm)
      0xbfb6a5, // Ground color (beige)
      0.3
    );
    this.scene.add(hemiLight);

    return { ambientLight, mainLight, hemiLight };
  }

  /**
   * Add fluorescent ceiling lights with soft glow
   */
  addCeilingLights(positions, height = 4.5, intensity = 0.35) {
    const lights = [];

    positions.forEach(pos => {
      // Soft point light
      const light = new THREE.PointLight(this.colors.fluorescent, intensity, 25);
      light.position.set(pos.x, height, pos.z);
      this.scene.add(light);

      // Add subtle glow sphere (visual only, not a real light)
      const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xfffef2,
        transparent: true,
        opacity: 0.6,
      });
      const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
      glowSphere.position.copy(light.position);
      this.scene.add(glowSphere);

      lights.push({ light, glow: glowSphere });
    });

    return lights;
  }

  /**
   * fake volumetric fog using layered transparent planes
   */
  createVolumetricFog(rooms, wallHeight = 5) {
    const fogLayers = [];

    rooms.forEach(room => {
      // Create 3-4 horizontal fog layers per room
      const numLayers = 3;
      
      for (let i = 0; i < numLayers; i++) {
        const heightPosition = (wallHeight / numLayers) * i + 0.5;
        
        // Create fog plane
        const fogGeometry = new THREE.PlaneGeometry(
          room.size * 1.2,
          room.size * 1.2
        );
        
        // Gradient texture for fog
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Radial gradient for soft fog
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, 'rgba(210, 203, 184, 0.15)'); // Center: lighter
        gradient.addColorStop(0.6, 'rgba(210, 203, 184, 0.08)');
        gradient.addColorStop(1, 'rgba(210, 203, 184, 0)'); // Edge: transparent
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        const fogMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        
        const fogPlane = new THREE.Mesh(fogGeometry, fogMaterial);
        fogPlane.rotation.x = -Math.PI / 2;
        fogPlane.position.set(room.position.x, heightPosition, room.position.z);
        
        this.scene.add(fogPlane);
        fogLayers.push(fogPlane);
      }
    });

    this.volumetricLayers = fogLayers;
    return fogLayers;
  }


  /**
   * Animate fog layers (subtle movement)
   */
  animateFog(time) {
    this.volumetricLayers.forEach((layer, index) => {
      // Gentle rotation
      layer.rotation.z = Math.sin(time * 0.0002 + index) * 0.02;
      
      // Subtle opacity pulse
      const baseMaterial = layer.material;
      baseMaterial.opacity = 0.35 + Math.sin(time * 0.001 + index) * 0.05;
    });
  }

  /**
   * Adjust materials 
   */
  applyMaterials(scene) {
    scene.traverse((object) => {
      if (object.isMesh && object.material) {
        // Increase roughness 
        if (object.material.roughness !== undefined) {
          object.material.roughness = Math.max(object.material.roughness, 0.9);
        }
        
        // Reduce metalness
        if (object.material.metalness !== undefined) {
          object.material.metalness = Math.min(object.material.metalness, 0.1);
        }

        // Slightly desaturate colors 
        if (object.material.color) {
          const currentColor = object.material.color;
          const desaturated = new THREE.Color().lerpColors(
            currentColor,
            new THREE.Color(0xcccccc),
            0.2 // 20% desaturation
          );
          object.material.color = desaturated;
        }
      }
    });
  }

  // Single call to setup lighting
  initialize(rooms) {
    // Setup base lighting
    const lights = this.setupLighting();

    // Add ceiling lights for each room
    const ceilingLightPositions = rooms.map(room => ({
      x: room.position.x,
      z: room.position.z
    }));
    const ceilingLights = this.addCeilingLights(ceilingLightPositions);

    // Create volumetric fog
    const fogLayers = this.createVolumetricFog(rooms);

    // Apply materials
    this.applyMaterials(this.scene);

    return {
      lights,
      ceilingLights,
      fogLayers,
    };
  }

  // basic loop updates I can add onto later
  update(time) {
    this.animateFog(time);
  }
}

export default LightManager;
