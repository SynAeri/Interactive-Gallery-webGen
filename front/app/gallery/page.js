'use client';
// ToDo: maybe create small experimental Autogeneration
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

export default function GalleryPage() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a1a, 1, 50); // Liminal fog Thingo for fun
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 5); // Eye level height for gallery stuff too
    cameraRef.current = camera;

    // Renderer setup basic shi
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting - liminal aesthetic
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Add some stuff testing light stuff hefre
    const pointLight1 = new THREE.PointLight(0xffffcc, 0.4, 20);
    pointLight1.position.set(0, 3, -10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffcc, 0.4, 20);
    pointLight2.position.set(0, 3, 10);
    scene.add(pointLight2);

    // Basic floor really basic baasic
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Basic walls for corridor
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Collision group for walls
    const Collisions = new THREE.Group(); // Might be a better solution ill check later
    scene.add(Collisions);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 5),
      wallMaterial
    );
    leftWall.position.set(-5, 2.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    Collisions.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 5),
      wallMaterial
    );
    rightWall.position.set(5, 2.5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    Collisions.add(rightWall);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      wallMaterial
    );
    backWall.position.set(0, 2.5, -50);
    Collisions.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 5),
      wallMaterial
    );
    frontWall.position.set(0, 2.5, 50);
    frontWall.rotation.y = Math.PI;
    Collisions.add(frontWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      wallMaterial
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);

    // Controls setup
    const controls = new PointerLockControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Movement variables
    const moveSpeed = 0.1;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const moveState = {
      backward: false,
      forward: false,
      left: false,
      right: false,
    };

    // Keyboard controls
    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveState.forward = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveState.backward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveState.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveState.right = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveState.forward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveState.backward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveState.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveState.right = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Raycaster setup (outside animate loop for performance)
    const raycaster = new THREE.Raycaster();
    raycaster.far = 0.6; // Check collisions within 0.6 units
    
    // Direction vectors
    const forwardDir = new THREE.Vector3();
    const backwardDir = new THREE.Vector3();
    const rightDir = new THREE.Vector3();
    const leftDir = new THREE.Vector3();

    // Helper function to check collision in a direction
    const checkCollision = (direction) => {
      raycaster.set(camera.position, direction);
      const intersects = raycaster.intersectObjects(Collisions.children);
      return intersects.length > 0 && intersects[0].distance < 0.5;
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controls.isLocked) {
        // Reset velocity
        velocity.x = 0;
        velocity.z = 0;

        // Get camera directions
        camera.getWorldDirection(forwardDir);
        forwardDir.y = 0; // Keep movement horizontal
        forwardDir.normalize();
        backwardDir.copy(forwardDir).negate();
        rightDir.crossVectors(forwardDir, camera.up).normalize();
        leftDir.copy(rightDir).negate();

        // Calculate movement direction
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();

        // Check collisions and apply movement
        let canMoveForward = true;
        let canMoveBackward = true;
        let canMoveRight = true;
        let canMoveLeft = true;

        if (moveState.forward) {
          canMoveForward = !checkCollision(forwardDir);
        }
        if (moveState.backward) {
          canMoveBackward = !checkCollision(backwardDir);
        }
        if (moveState.right) {
          canMoveRight = !checkCollision(rightDir);
        }
        if (moveState.left) {
          canMoveLeft = !checkCollision(leftDir);
        }

        // Apply movement only if no collision
        if ((moveState.forward && canMoveForward) || (moveState.backward && canMoveBackward)) {
          velocity.z = direction.z * moveSpeed;
        }
        if ((moveState.right && canMoveRight) || (moveState.left && canMoveLeft)) {
          velocity.x = direction.x * moveSpeed;
        }
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current && renderer.domElement) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleStartExperience = () => {
    controlsRef.current?.lock();
    setShowOverlay(false);

  };

  return (
    <div className="relative w-full h-screen">
      {/* Three.js Canvas Container */}
      <div ref={canvasRef} className="w-full h-full" />

      {/* Overlay Instructions */}
      {showOverlay && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm p-8 rounded-lg text-white text-center pointer-events-auto max-w-md">
          <h1 className="text-4xl font-bold mb-4">Liminal Gallery</h1>
          <p className="text-gray-300 mb-6">
            An immersive 3D art experience TEST
          </p>
          <button
            onClick={handleStartExperience}
            className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Enter Gallery
          </button>
          <div className="mt-6 text-sm text-gray-400">
            <p>Use WASD or Arrow Keys to move</p>
            <p>Move your mouse to look around</p>
            <p>Press ESC to exit pointer lock</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
