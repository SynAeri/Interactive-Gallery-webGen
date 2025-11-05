'use client';


import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import GalleryGenerator from './components/GalleryGenerator';
import ArtworkLoader from './components/ArtworkLoader';
import LightManager from './components/LightManager';
import AssetLoadingManager from './components/AssetLoadingManager';
import Joystick from './components/Joystick';

export default function GalleryPage() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const atmosphereRef = useRef(null);
  
  const [showOverlay, setShowOverlay] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [loadError, setLoadError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);


  const moveState = useRef({ forward: false, backward: false, left: false, right: false });

  const lookState = useRef({ x: 0, y: 0 });

  // --- Joystick Handler --- // 
  const handleMove = (event) => {
    const threshold = 0.3; 

    // Translate analog joystick (event.x, event.y) to boolean moveState
    moveState.current.forward = event.y > threshold;
    moveState.current.backward = event.y < -threshold;
    moveState.current.left = event.x < -threshold;
    moveState.current.right = event.x > threshold;
  };

  const handleMoveStop = () => {
    // Reset all movement when the stick is released
    moveState.current.forward = false;
    moveState.current.backward = false;
    moveState.current.left = false;
    moveState.current.right = false;
  };

  const handleLook = (event) => {
    // Just store the raw X/Y. The game loop will use this.
    lookState.current.x = event.x;
    lookState.current.y = event.y;
  };

  const handleLookStop = () => {
    lookState.current.x = 0;
    lookState.current.y = 0;
  };


  useEffect(() => {

    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    setIsMobile(checkMobile);

    if (!canvasRef.current) return;

    const initGallery = async (isMobileDevice) => {
      try {
        setLoadingStatus('Loading assets...');

        // ===== ASSET LOADING =====
        const assetManager = new AssetLoadingManager(
          // Progress callback
          (url, loaded, total) => {
            const progress = Math.round((loaded / total) * 100);
            setLoadingProgress(progress);
            setLoadingStatus(`Loading assets... ${loaded}/${total}`);
          },
          // Complete callback
          () => {
            console.log('All assets loaded');
          },
          // Error callback
          (url) => {
            console.warn(`Error loading: ${url}`);
          }
        );

        // Load all assets
        const assets = await assetManager.loadAllAssets({
          // Optional: Wall/floor textures
          textures: {
          },
          // Artworks JSON
          artworksJsonUrl: process.env.NEXT_PUBLIC_ARTWORKS_URL || '/artworks.json',
          // Preload artwork images for smoother experience
          preloadArtworkImages: true,
          theme: 'liminal', // Assets for wall pngs
          useThemeTextures: true,
          
        });

        if (assets.artworks.length === 0) {
          console.warn('No artworks loaded! Using test mode.');
          setLoadError(true);
        }

        setLoadingStatus('Building gallery...');
        setLoadingProgress(50);

        // ===== SCENE SETUP =====
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
          75,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance', // Use dedicated GPU if available
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        
        canvasRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        setLoadingProgress(60);
        setLoadingStatus('Generating rooms...');

        // ===== GENERATE GALLERY =====
        const generator = new GalleryGenerator({
          picturesAvailable: assets.artworks.length || 20,
          picturesPerRoom: 2,
          roomSize: null,
          hallwayWidth: 5,
          wallHeight: 5,
          complexity: 'default',
          // seed: 42,
          theme: 'liminal'  // Theme handles all materials/colors!
          
        });

        const layout = generator.generateGallery();
        
        // Build geometry with textures (theme system handles tiling automatically)
        const { collisionGroup, artworkPlacements, spawnPosition } = 
          generator.buildGeometry(scene, assets.textures);

        setLoadingProgress(85);
        setLoadingStatus('Setting up atmosphere...');

        // ===== Light Manager =====
        const atmosphere = new LightManager(scene, camera, {
          backgroundColor: 0xbfb6a5,
          fogColor: 0xF2E583,
          fogDensity: { near: 2, far: 60 },
          ambientColor: 0xE6DAB8, // Filter basically
          fluorescentColor: 0xFFF5BF,
        });

        atmosphere.initialize(layout.rooms);
        atmosphereRef.current = atmosphere;

        setLoadingProgress(85);
        setLoadingStatus('Placing artworks...');

        // ===== PLACE ARTWORKS =====
        const artworkLoader = new ArtworkLoader();
        artworkLoader.artworks = assets.artworks;

        if (assets.artworks.length > 0) {
          artworkLoader.placeArtworks(scene, artworkPlacements, {
            showLabels: true,           // Enable/disable labels
            // 'bottom' == title, Name, desc on bottom of art
            // 'side' == title and art name very minimal
            // 'verbose' == best of both worlds but all on the side
            labelStyle: 'verbose',         // 'side' or 'bottom' or 'verbose'
            showDescription: true      // Show full description (only for 'bottom' style)
          });
          
          // Wait for all textures to actually load into memory
          setLoadingStatus('Waiting for artwork textures...');
          await artworkLoader.waitForTexturesLoaded();
          
        }
        

        camera.position.copy(spawnPosition);

        setLoadingProgress(95);
        setLoadingStatus('Pre-rendering gallery (preventing stutters)...');
        if (!isMobileDevice){
          // Visit every location and render to force EVERYTHING into GPU cache
          await new Promise(resolve => {
            setTimeout(async () => {
              console.log('Starting comprehensive pre-render...');

              const originalPosition = camera.position.clone();
              const originalRotation = camera.rotation.clone();

              // Step 1: Compile shaders
              renderer.compile(scene, camera);
              console.log('Shaders compiled');

              // Step 2: Visit EVERY room and look in ALL directions
              let renderCount = 0;

              for (const room of layout.rooms) {
                // Stand in center of room
                camera.position.set(room.position.x, 2.5, room.position.z);

                // Look in 8 directions (N, NE, E, SE, S, SW, W, NW)
                for (let angle = 0; angle < 360; angle += 45) {
                  camera.rotation.y = (angle * Math.PI) / 180;

                  // Look straight
                  camera.rotation.x = 0;
                  renderer.render(scene, camera);
                  renderCount++;

                  // Look up slightly
                  camera.rotation.x = Math.PI / 6;
                  renderer.render(scene, camera);
                  renderCount++;

                  // Look down slightly  
                  camera.rotation.x = -Math.PI / 6;
                  renderer.render(scene, camera);
                  renderCount++;
                }  
              }

              // Step 3: Visit hallways
              for (const hallway of layout.hallways) {
                const room1 = layout.rooms.find(r => r.id === hallway.from);
                const room2 = layout.rooms.find(r => r.id === hallway.to);

                if (room1 && room2) {
                  // Stand in middle of hallway
                  const midX = (room1.position.x + room2.position.x) / 2;
                  const midZ = (room1.position.z + room2.position.z) / 2;

                  camera.position.set(midX, 2.5, midZ);

                  // Look both ways
                  const dx = room2.position.x - room1.position.x;
                  const dz = room2.position.z - room1.position.z;
                  const angle = Math.atan2(dx, dz);

                  camera.rotation.y = angle;
                  renderer.render(scene, camera);
                  camera.rotation.y = angle + Math.PI;
                  renderer.render(scene, camera);

                  renderCount += 2;
                }
              }

              // Step 4: Stand at spawn and do final 360° sweep
              camera.position.copy(originalPosition);
              for (let angle = 0; angle < 360; angle += 30) {
                camera.rotation.y = (angle * Math.PI) / 180;
                camera.rotation.x = 0;
                renderer.render(scene, camera);
                renderCount++;
              }

              // Step 5: Restore original view and render final frame
              camera.position.copy(originalPosition);
              camera.rotation.copy(originalRotation);
              renderer.render(scene, camera);

              console.log(`Pre-render complete: ${renderCount} total renders`);
              console.log(`Everything should be in GPU cache now`);

              requestAnimationFrame(() => {
                resolve();
              });
            }, 500); // Small delay to ensure textures are ready
          });
        } else {
          console.log('is mobile');
          renderer.compile(scene, camera);
        }
        setLoadingProgress(98);
        setLoadingStatus('Finalizing...');

        // ===== CONTROLS ===== //
        const controls = new PointerLockControls(camera, renderer.domElement);
        const mobileLookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        controlsRef.current = controls;

        const moveSpeed = 0.15;
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const onKeyDown = (event) => {
          switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
              moveState.current.forward = true;
              break;
            case 'ArrowDown':
            case 'KeyS':
              moveState.current.backward = true;
              break;
            case 'ArrowLeft':
            case 'KeyA':
              moveState.current.left = true;
              break;
            case 'ArrowRight':
            case 'KeyD':
              moveState.current.right = true;
              break;
          }
        };

        const onKeyUp = (event) => {
          switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
              moveState.current.forward = false;
              break;
            case 'ArrowDown':
            case 'KeyS':
              moveState.current.backward = false;
              break;
            case 'ArrowLeft':
            case 'KeyA':
              moveState.current.left = false;
              break;
            case 'ArrowRight':
            case 'KeyD':
              moveState.current.right = false;
              break;
          }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.far = 0.6;
        
        const forwardDir = new THREE.Vector3();
        const backwardDir = new THREE.Vector3();
        const rightDir = new THREE.Vector3();
        const leftDir = new THREE.Vector3();

        const checkCollision = (direction) => {
          raycaster.set(camera.position, direction);
          const intersects = raycaster.intersectObjects(collisionGroup.children);
          return intersects.length > 0 && intersects[0].distance < 0.5;
        };

        // Animation loop
        // clock to help with speed

        const clock = new THREE.Clock();
        let startTime = Date.now();

        
        const animate = () => {

          requestAnimationFrame(animate);
          const delta = clock.getDelta();
          const currentTime = Date.now() - startTime;

          if (atmosphereRef.current) {
            atmosphereRef.current.update(currentTime);
          }

          if (controls.isLocked) {
            velocity.x = 0;
            velocity.z = 0;

            camera.getWorldDirection(forwardDir);
            forwardDir.y = 0;
            forwardDir.normalize();
            
            backwardDir.copy(forwardDir).negate();
            rightDir.crossVectors(forwardDir, camera.up).normalize();
            leftDir.copy(rightDir).negate();

            direction.z = Number(moveState.current.backward) - Number(moveState.current.forward);
            direction.x = Number(moveState.current.left) - Number(moveState.current.right);
            direction.normalize();

            let canMoveForward = !moveState.current.forward || !checkCollision(forwardDir);
            let canMoveBackward = !moveState.current.backward || !checkCollision(backwardDir);
            let canMoveRight = !moveState.current.right || !checkCollision(rightDir);
            let canMoveLeft = !moveState.current.left || !checkCollision(leftDir);

            if ((moveState.current.forward && canMoveForward) || (moveState.current.backward && canMoveBackward)) {
              velocity.z = direction.z * moveSpeed;
            }
            if ((moveState.current.right && canMoveRight) || (moveState.current.left && canMoveLeft)) {
              velocity.x = direction.x * moveSpeed;
            }

            controls.moveRight(-velocity.x);
            controls.moveForward(-velocity.z);
          } else if (isMobileDevice){
              // ===== ToDO Fix later and refactor ===== // 

              // Camera Stuff 
              const lookSpeed = 1.5; // Look sensitivity
              const deltaX = lookState.current.x * lookSpeed * delta;
              const deltaY = lookState.current.y * lookSpeed * delta;
              
              mobileLookEuler.setFromQuaternion(camera.quaternion);
              
              mobileLookEuler.y -= deltaX; // Yaw (left/right)
              mobileLookEuler.x += deltaY; // Pitch (up/down)
              
              const maxPitch = Math.PI / 2.2;
              mobileLookEuler.x = Math.max(-maxPitch, Math.min(maxPitch, mobileLookEuler.x));
              
              // Apply new rotation back to the camera's quaternion
              camera.quaternion.setFromEuler(mobileLookEuler);

              // Handle Moving
              // We re-calculate velocity using the same collision logic
              velocity.x = 0;
              velocity.z = 0;

              camera.getWorldDirection(forwardDir);
              forwardDir.y = 0;
              forwardDir.normalize();

              backwardDir.copy(forwardDir).negate();
              rightDir.crossVectors(forwardDir, camera.up).normalize();
              leftDir.copy(rightDir).negate();

              direction.z = Number(moveState.current.backward) - Number(moveState.current.forward);
              direction.x = Number(moveState.current.left) - Number(moveState.current.right);
              direction.normalize(); // -1, 0, or 1

              let canMoveForward = !moveState.current.forward || !checkCollision(forwardDir);
              let canMoveBackward = !moveState.current.backward || !checkCollision(backwardDir);
              let canMoveRight = !moveState.current.right || !checkCollision(rightDir);
              let canMoveLeft = !moveState.current.left || !checkCollision(leftDir);

              const mobileMoveSpeed = 3.0; // 3 units per second

              if ((moveState.current.forward && canMoveForward) || (moveState.current.backward && canMoveBackward)) {
                velocity.z = direction.z * mobileMoveSpeed * delta;
              }
              if ((moveState.current.right && canMoveRight) || (moveState.current.left && canMoveLeft)) {
                velocity.x = direction.x * mobileMoveSpeed * delta;
              }

              // --- Apply Movement Manually ---
              controls.moveForward(-velocity.z);
              controls.moveRight(-velocity.x);
          }

          renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
          if (!camera || !renderer) return;
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Finish loading
        setLoadingProgress(100);
        setLoadingStatus('Ready!');
        
        // Small delay before hiding loading screen for smooth transition
        setTimeout(() => {
          setLoading(false);
        }, 500);

        return () => {
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
          window.removeEventListener('resize', handleResize);
          if (canvasRef.current && renderer.domElement) {
            canvasRef.current.removeChild(renderer.domElement);
          }
          renderer.dispose();
          artworkLoader.dispose();
        };
      } catch (error) {
        console.error('Error initializing gallery:', error);
        setLoadError(true);
        setLoading(false);
      }
    };
    initGallery(checkMobile);
  }, []);

const handleStartExperience = () => {
    controlsRef.current?.lock();
    setShowOverlay(false);
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={canvasRef} className="w-full h-full" />

      {/* Loading Screen */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-block w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Loading Gallery</h2>
            <p className="text-gray-400 mb-2">{loadingStatus}</p>
            
            {/* Progress Bar */}
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 mt-2 text-sm">{loadingProgress}%</p>
          </div>
        </div>
      )}

      {/* Entry Overlay */}
      {showOverlay && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm p-8 rounded-lg text-white text-center pointer-events-auto max-w-md">
            <h1 className="text-4xl font-bold mb-4">Gallery</h1>
            {loadError ? (
              <p className="text-yellow-400 mb-6">
                Running in test mode - add artworks.json to enable images
              </p>
            ) : (
              <p className="text-gray-300 mb-6">
                A dreamlike space very nostalgic 
              </p>
            )}
            <button
              onClick={handleStartExperience}
              className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Enter Gallery
            </button>
            <div className="mt-6 text-sm text-gray-400">
              <p>Use WASD or Arrow Keys to move</p>
              <p>Move your mouse to look around</p>
              <p>Press ESC to exit</p>
            </div>
          </div>
        </div>
      )}

      {isMobile && !loading && (
        <Joystick
          onMove={handleMove}
          onStop={handleMoveStop}
          onLook={handleLook}
          onLookStop={handleLookStop}
        />
      )}
    </div>
  );


}
