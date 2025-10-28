import * as THREE from 'three';
import { applyTextureToMaterial, createThemedMaterial } from './GalleryThemes';

// Generates the whole gallery visually 
//
class GalleryGenerator {
  constructor(options = {}) {
    // Core config.
    
    // Get picture choices or outputs 12 for standard room gen things
    this.picturesAvailable = options.picturesAvailable || 12; 
    // Standard stuff picsAvailable/picsperroom == 3 rooms
    this.picturesPerRoom = options.picturesPerRoom || 4;

    this.roomSize = options.roomSize || null; // null == auto-calculate based on pictures
    this.hallwayWidth = options.hallwayWidth || 5; // Can change the width of some hallways
    this.wallHeight = options.wallHeight || 5;
    this.wallThickness = 0.2;
    this.complexity = options.complexity || 'default'; // 'simple', 'default', 'complex'
    this.seed = options.seed || Math.random();
    this.theme = options.theme || 'classic'; // Gallery theme
    
    // Calculate number of rooms needed (pigeon hole principle)
    this.numRooms = Math.ceil(this.picturesAvailable / this.picturesPerRoom);
    
    // Auto-calculate room size based on pictures per room if not specified
    if (!this.roomSize) {
      // Formula: bigger rooms for more pictures
      // 1-2 pics = 15, 3-4 pics = 20, 5-6 pics = 25, 7-8 pics = 30, etc.
      this.roomSize = Math.max(15, Math.ceil(this.picturesPerRoom / 2) * 5 + 10);
    }
    
    console.log(`Room size: ${this.roomSize} (${this.picturesPerRoom} pictures per room)`);
    console.log(`Gallery theme: ${this.theme}`);
    
    // Internal tracking
    // For further additions
    this.rooms = [];
    this.hallways = [];
    this.artworkPlacements = [];
    this.collisionGroup = new THREE.Group();
    
    console.log(`Generating ${this.numRooms} rooms for ${this.picturesAvailable} artworks`);
  }

  // Seeded random for consistent generation
  // Important for deciding rooms stuff
  seededRandom() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }



// ------- //
//  Core  //
// ------ //
// Generates the whole layoung
  // Uses Prims Algorithm to base the prediction of rooms around
  generateGallery() {
    // Room 0 is always the entry room at origin point
    this.rooms.push({
      id: 0,
      position: { x: 0, z: 0 },
      size: this.roomSize,
      isEntry: true,
      connections: [] // Which rooms it connects to list since it connects to multiple
    });

    // Generate additional rooms based on complexity
    this.generateRoomLayout();
    
    // Generate hallway connections
    this.generateHallways();
    
    // Calculate artwork placements
    this.calculateArtworkPlacements();
    
    return {
      rooms: this.rooms,
      hallways: this.hallways,
      artworkPlacements: this.artworkPlacements
    };
  }

// ------------------ //
//  Room Layout Gen  //
// ---------------- //

  // Generate the room based on complexity//
  generateRoomLayout() {
    const positions = this.getRoomPositions();
    
    console.log('room pos:');
    console.log(`  Room 0 (entry):(0,0)`);
    
    for (let i = 1; i < this.numRooms; i++) {
        if (!positions[i-1]) {
             console.error(`Could not generate position for room ${i}. Stopping.`);
             this.numRooms = i; // Adjust room count to what was actually generated
             break;
        }
      const pos = positions[i - 1];
      console.log(`  Room ${i}: (${pos.x}, ${pos.z})`);
      this.rooms.push({
        id: i,
        position: pos,
        size: this.roomSize,
        isEntry: false,
        connections: []
      });
    }
    console.log('');
  }

  // Generate room Positions cont. from Gen room layout
  getRoomPositions() {
    const positions = [];
    const usedPositions = new Set();
    usedPositions.add('0,0'); // Add entry room
    
    // Spacing between room centers. roomSize * 2 ensures a room-sized gap
    // for a hallway.
    const spacing = this.roomSize * 2;

    // 'simple' case: Just a straight line
    if (this.complexity === 'simple') {
        for (let i = 1; i < this.numRooms; i++) {
            positions.push({ x: 0, z: i * spacing });
        }
        return positions;
    }

    // 'default' case: Prims algorithm
    // 'openPositions' stores potential new room *centers*
    // We use a Map { key: {x, z} } to prevent duplicate potential spots
    const openPositions = new Map(); 
    
    // Add neighbors of the entry room (R0) as starting points
    openPositions.set(`0,${spacing}`,  { x: 0, z: spacing });  // North
    openPositions.set(`0,${-spacing}`, { x: 0, z: -spacing }); // South
    openPositions.set(`${spacing},0`,  { x: spacing, z: 0 });  // East
    openPositions.set(`${-spacing},0`, { x: -spacing, z: 0 }); // West

    for (let i = 1; i < this.numRooms; i++) {
        if (openPositions.size === 0) {
            console.error(`Generator ran out of open positions for room ${i}. Gallery will be smaller than requested.`);
            break;
        }

        // Pick a random position from the open list
        const openKeys = Array.from(openPositions.keys());
        const randomKey = openKeys[Math.floor(this.seededRandom() * openKeys.length)];
        const newPos = openPositions.get(randomKey);

        // Remove this position from open list since its now taken
        openPositions.delete(randomKey);
        
        // Add this new position to our list
        positions.push(newPos);
        usedPositions.add(randomKey);

        // Add the *new* neighbors of this position to the open list
        const neighbors = [
            { x: newPos.x, z: newPos.z + spacing }, // North
            { x: newPos.x, z: newPos.z - spacing }, // South
            { x: newPos.x + spacing, z: newPos.z }, // East
            { x: newPos.x - spacing, z: newPos.z }  // West
        ];

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.z}`;
            // Add to open list *only* if it's not already a used room
            if (!usedPositions.has(neighborKey)) {
                openPositions.set(neighborKey, neighbor);
            }
        }
    }

    return positions;
  }


  // Generates the hallway connections between the old rooms
  generateHallways() {
    // Spacing between room centers
    const spacing = this.roomSize * 2; 
    console.log('Generating Hallways');

    // Iterate through all unique pairs of rooms
    // basic loop to see if the room i is closer to rooms j and stuff
    for (let i = 0; i < this.rooms.length; i++) {
        for (let j = i + 1; j < this.rooms.length; j++) {
            const room1 = this.rooms[i];
            const room2 = this.rooms[j];
            
            const dist = this.roomDistance(room1, room2);

            // Connect if rooms are *exactly* one 'spacing' unit apart
            // Use small int (0.1) for floating point comparison
            if (Math.abs(dist - spacing) < 0.1) { 
                // must ensure they are aligned horizontally or vertically
                const dx = Math.abs(room1.position.x - room2.position.x);
                const dz = Math.abs(room1.position.z - room2.position.z);

                // They are horiz or vert. We connect them to rooms1 to rooms2
                if ( (dx < 0.1 && Math.abs(dz - spacing) < 0.1) || // Vertical
                     (dz < 0.1 && Math.abs(dx - spacing) < 0.1) )  // Horizontal
                {
                    console.log(`  Connecting adjacent rooms: ${room1.id} <-> ${room2.id}`);
                    this.connectRooms(room1.id, room2.id);
                }
            }
        }
    }
    console.log('');
  }
  // Method to calc room distance is used for the dist spacing for hallways
  roomDistance(room1, room2) {
    const dx = room1.position.x - room2.position.x;
    const dz = room1.position.z - room2.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // Connect rooms after they pass all the if conditionals
  connectRooms(roomId1, roomId2) {
    const room1 = this.rooms[roomId1];
    const room2 = this.rooms[roomId2];

    // Mark connection for room tracking 
    room1.connections.push(roomId2);
    room2.connections.push(roomId1);

    // Determine hallway direction
    const dx = room2.position.x - room1.position.x;
    const dz = room2.position.z - room1.position.z;

    const hallway = {
      from: roomId1,
      to: roomId2,
      startPos: { ...room1.position },
      endPos: { ...room2.position },
      direction: Math.abs(dx) > Math.abs(dz) ? 'horizontal' : 'vertical'
    };

    this.hallways.push(hallway);
  }

  // Calc positions to place artwork
  calculateArtworkPlacements() {
    let artworkIndex = 0;
    const unplacedArtworks = [];
    const artworksPerRoom = new Map();  // Track how many artworks already placed per room

    console.log('Placing artworks');

    // First: Try to place artworks in each room
    for (const room of this.rooms) {
      const artworksInRoom = Math.min(
        this.picturesPerRoom,
        this.picturesAvailable - artworkIndex
      );

      // Place artworks on walls around the room
      const wallPositions = this.getWallPositions(room, artworksInRoom);

      // If room returned no positions (crossroads), mark artworks as unplaced
      if (wallPositions.length === 0 && artworksInRoom > 0) {
        console.warn(`  Room ${room.id} cannot hold artworks (crossroads). Will redistribute to other rooms.`);
        artworksPerRoom.set(room.id, 0);  // Track: 0 artworks placed
        for (let i = 0; i < artworksInRoom; i++) {
          unplacedArtworks.push(artworkIndex++);
        }
        continue;
      }

      let placedCount = 0;
      for (let i = 0; i < artworksInRoom; i++) {
        if (!wallPositions[i]) {
            console.warn(`  Could not find placement for artwork ${artworkIndex} in room ${room.id}`);
            unplacedArtworks.push(artworkIndex++);
            continue;
        }
        this.artworkPlacements.push({
          artworkId: artworkIndex++,
          roomId: room.id,
          position: wallPositions[i].position,
          rotation: wallPositions[i].rotation,
          wall: wallPositions[i].wall
        });
        placedCount++;
      }
      
      artworksPerRoom.set(room.id, placedCount);  // Track how many placed in this room

      if (artworkIndex >= this.picturesAvailable) break;
    }

    // Second : Redistribute unplaced artworks to rooms with space
    if (unplacedArtworks.length > 0) {
      console.log(`  Redistributing ${unplacedArtworks.length} unplaced artworks...`);
      
      for (const artworkId of unplacedArtworks) {
        let placed = false;
        
        // TRY 1: Smart redistribution (prefer rooms with space)
        for (const room of this.rooms) {
          const doorways = this.getDoorwaysForRoom(room);
          const availableWalls = ['north', 'east', 'south', 'west'].filter(
            wall => !doorways[wall]
          );
          
          // Skip crossroads
          if (availableWalls.length === 0) {
            continue;
          }
          
          const currentCount = artworksPerRoom.get(room.id) || 0;
          const maxPerRoom = Math.floor(room.size / 2.5); // Heuristic: 1 artwork per 2.5 units
          
          // Skip full rooms
          if (currentCount >= maxPerRoom) {
            continue;
          }
          
          // Try to get positions for currentCount + 1
          const totalPositions = this.getWallPositions(room, currentCount + 1);
          
          // Check if we got ANY positions
          if (totalPositions.length === 0) {
            continue;
          }
          
          // try fix: Get only NEW positions (slice from currentCount)
          const availableNewPositions = totalPositions.slice(currentCount);
          
          if (availableNewPositions.length > 0) {
            const newPosition = availableNewPositions[0];
            this.artworkPlacements.push({
              artworkId: artworkId,
              roomId: room.id,
              position: newPosition.position,
              rotation: newPosition.rotation,
              wall: newPosition.wall
            });
            
            artworksPerRoom.set(room.id, currentCount + 1);
            placed = true;
            console.log(`redistributed artwork ${artworkId} to room ${room.id}`);
            break;
          }
        }
        
        // TRY 2: Force placement if still not placed
        if (!placed) {
          console.warn(`Forcing placement for artwork ${artworkId}...`);
          
          for (const room of this.rooms) {
            const doorways = this.getDoorwaysForRoom(room);
            const availableWalls = ['north', 'east', 'south', 'west'].filter(
              wall => !doorways[wall]
            );
            
            if (availableWalls.length > 0) {
              const currentCount = artworksPerRoom.get(room.id) || 0;
              // Ask for many positions
              const positions = this.getWallPositions(room, currentCount + 10); 
              
              if (positions.length > currentCount) {
                const newPos = positions[currentCount];
                this.artworkPlacements.push({
                  artworkId: artworkId,
                  roomId: room.id,
                  position: newPos.position,
                  rotation: newPos.rotation,
                  wall: newPos.wall
                });
                
                artworksPerRoom.set(room.id, currentCount + 1);
                placed = true;
                console.log(`force-placed artwork ${artworkId} in room ${room.id}`);
                break;
              }
            }
          }
        }  
      }
    }  
  }

  // Get wall pos. for artworks in room cont of artworks in room to determine positions can have available
  getWallPositions(room, count) {
    const positions = [];
    const wallOffset = 0.3;
    const halfSize = room.size / 2;
    const artworkHeight = 2.5;

    // Determine which walls have doorways (can't place art there)
    const doorways = this.getDoorwaysForRoom(room);

    // Filter out walls with doorways
    const availableWalls = ['north', 'east', 'south', 'west'].filter(
      wall => !doorways[wall]
    );

    if (availableWalls.length === 0) {
      // Room is a crossroads (all walls have doorways)
      // Cannot place artwork safely - skip this room
      // console.warn(`Room ${room.id} is a crossroads with no available walls. Skipping artwork placement.`);
      return [];  // Return empty array - no artworks in this room
    }

    // Calculate how many artworks per wall
    const basePerWall = Math.floor(count / availableWalls.length);
    const remainder = count % availableWalls.length;

    const artworksPerWall = {};
    availableWalls.forEach((wall, index) => {
      artworksPerWall[wall] = basePerWall + (index < remainder ? 1 : 0);
    });

    // Place artworks on each available wall
    for (const [wallName, numOnWall] of Object.entries(artworksPerWall)) {
      if (numOnWall === 0) continue;

      const spacing = room.size / (numOnWall + 1);

      for (let i = 0; i < numOnWall; i++) {
        const offset = (i + 1) * spacing - halfSize;
        let position, rotation;

        switch (wallName) {
          case 'north':
            position = new THREE.Vector3(
              room.position.x + offset,
              artworkHeight,
              room.position.z + halfSize - wallOffset
            );
            rotation = new THREE.Euler(0, Math.PI, 0);
            break;
          case 'south':
            position = new THREE.Vector3(
              room.position.x + offset,
              artworkHeight,
              room.position.z - halfSize + wallOffset
            );
            rotation = new THREE.Euler(0, 0, 0);
            break;
          case 'east':
            position = new THREE.Vector3(
              room.position.x + halfSize - wallOffset,
              artworkHeight,
              room.position.z + offset
            );
            rotation = new THREE.Euler(0, -Math.PI / 2, 0);
            break;
          case 'west':
            position = new THREE.Vector3(
              room.position.x - halfSize + wallOffset,
              artworkHeight,
              room.position.z + offset
            );
            rotation = new THREE.Euler(0, Math.PI / 2, 0);
            break;
        }

        positions.push({ position, rotation, wall: wallName });
      }
    }

    return positions;
  }

  // Check which walls have doorways for a room
  getDoorwaysForRoom(room) {
    const doorways = {
      north: false,
      south: false,
      east: false,
      west: false
    };

    for (const hallway of this.hallways) {
      if (hallway.from === room.id || hallway.to === room.id) {
        const otherRoom = this.rooms[hallway.from === room.id ? hallway.to : hallway.from];
        const dx = otherRoom.position.x - room.position.x;
        const dz = otherRoom.position.z - room.position.z;

        if (Math.abs(dx) > Math.abs(dz)) {
          if (dx > 0) doorways.east = true;
          else doorways.west = true;
        } else {
          if (dz > 0) doorways.north = true;
          else doorways.south = true;
        }
      }
    }

    return doorways;
  }

  // Build geometry from layout
  buildGeometry(scene, textures = {}) {
    // Store textures (may be empty/undefined)
    this.textures = textures || {};

    // Create themed materials (always work even without textures)
    const wallMaterial = createThemedMaterial(this.theme, 'wall');
    const floorMaterial = createThemedMaterial(this.theme, 'floor');
    const ceilingMaterial = createThemedMaterial(this.theme, 'ceiling');

    // Build rooms
    for (const room of this.rooms) {
      this.buildRoom(scene, room, wallMaterial, floorMaterial, ceilingMaterial);
    }

    // Build hallways
    for (const hallway of this.hallways) {
      this.buildHallway(scene, hallway, wallMaterial, floorMaterial, ceilingMaterial);
      this.addHallwayTrim(scene, hallway);  // Add trim to hallways
    }

    // Add collision group to scene
    scene.add(this.collisionGroup);

    return {
      collisionGroup: this.collisionGroup,
      artworkPlacements: this.artworkPlacements,
      spawnPosition: new THREE.Vector3(
        this.rooms[0].position.x,
        1.6,
        this.rooms[0].position.z - this.roomSize / 4
      )
    };
  }

  // Single room maker
  buildRoom(scene, room, wallMaterial, floorMaterial, ceilingMaterial) {

    // Determine which walls need doorways
    const doorways = this.getDoorwaysForRoom(room);

    // Create walls with doorways
    this.createWallWithDoorway(scene, room, 'north', doorways.north, wallMaterial, room.size, this.wallHeight);
    this.createWallWithDoorway(scene, room, 'south', doorways.south, wallMaterial, room.size, this.wallHeight);
    this.createWallWithDoorway(scene, room, 'east', doorways.east, wallMaterial, room.size, this.wallHeight);
    this.createWallWithDoorway(scene, room, 'west', doorways.west, wallMaterial, room.size, this.wallHeight);

    // Add wall trim (baseboards and crown molding)
    this.addWallTrim(scene, room);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(room.size, room.size);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial.clone());
    
    // Apply floor texture with proper tiling
    if (this.textures.floor) {
      applyTextureToMaterial(this.textures.floor, floor.material, room.size, room.size, this.theme, 'floor');
    }
    
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(room.position.x, 0, room.position.z);
    scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial.clone());
    
    // Apply ceiling texture with proper tiling
    const ceilingTexture = this.textures.ceiling || this.textures.wall;
    if (ceilingTexture) {
      applyTextureToMaterial(ceilingTexture, ceiling.material, room.size, room.size, this.theme, 'ceiling');
    }
    
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(room.position.x, this.wallHeight, room.position.z);
    scene.add(ceiling);
  }

  // Create wall with optional doorway
  createWallWithDoorway(scene, room, direction, hasDoorway, wallMaterial, wallHeight) {
    const halfSize = room.size / 2;
    const wallThickness = this.wallThickness;
    const doorwayWidth = this.hallwayWidth;

    let width, depth, x, z, rotation;

    switch (direction) {
      case 'north':
        width = room.size;
        depth = wallThickness;
        x = room.position.x;
        z = room.position.z + halfSize;
        rotation = 0;
        break;
      case 'south':
        width = room.size;
        depth = wallThickness;
        x = room.position.x;
        z = room.position.z - halfSize;
        rotation = 0;
        break;
      case 'east':
        width = room.size;
        depth = wallThickness;
        x = room.position.x + halfSize;
        z = room.position.z;
        rotation = Math.PI / 2;
        break;
      case 'west':
        width = room.size;
        depth = wallThickness;
        x = room.position.x - halfSize;
        z = room.position.z;
        rotation = Math.PI / 2;
        break;
    }

    if (hasDoorway) {
      // Create two wall segments on either side of the doorway
      const segmentWidth = (width - doorwayWidth) / 2;
      
      if (segmentWidth > 0.5) { // Only create segments if they're big enough
        // Left segment
        const leftGeometry = new THREE.BoxGeometry(segmentWidth, wallHeight, depth);
        const leftMaterial = wallMaterial.clone();
        
        // Apply texture with proper tiling for this segment
        if (this.textures.wall) {
          applyTextureToMaterial(this.textures.wall, leftMaterial, segmentWidth, wallHeight, this.theme, 'wall');
        }
        
        const leftWall = new THREE.Mesh(leftGeometry, leftMaterial);
        const offset = (width / 2 - segmentWidth / 2);
        
        if (direction === 'north' || direction === 'south') {
          leftWall.position.set(x - offset, wallHeight / 2, z);
        } else {
          leftWall.position.set(x, wallHeight / 2, z - offset);
        }
        leftWall.rotation.y = rotation;
        scene.add(leftWall);
        this.collisionGroup.add(leftWall);

        // Right segment
        const rightGeometry = new THREE.BoxGeometry(segmentWidth, wallHeight, depth);
        const rightMaterial = wallMaterial.clone();
        
        // Apply texture with proper tiling for this segment
        if (this.textures.wall) {
          applyTextureToMaterial(this.textures.wall, rightMaterial, segmentWidth, wallHeight, this.theme, 'wall');
        }
        
        const rightWall = new THREE.Mesh(rightGeometry, rightMaterial);
        
        if (direction === 'north' || direction === 'south') {
          rightWall.position.set(x + offset, wallHeight / 2, z);
        } else {
          rightWall.position.set(x, wallHeight / 2, z + offset);
        }
        rightWall.rotation.y = rotation;
        scene.add(rightWall);
        this.collisionGroup.add(rightWall);
      }
    } else {
      // Create full wall (no doorway)
      const geometry = new THREE.BoxGeometry(width, wallHeight, depth);
      const material = wallMaterial.clone();
      
      // Apply texture with proper tiling for this wall
      if (this.textures.wall) {
        applyTextureToMaterial(this.textures.wall, material, width, wallHeight, this.theme, 'wall');
      }
      
      const wall = new THREE.Mesh(geometry, material);
      wall.position.set(x, wallHeight / 2, z);
      wall.rotation.y = rotation;
      scene.add(wall);
      this.collisionGroup.add(wall);
    }
  }

  /**
   * Build a hallway between two rooms
   */
  buildHallway(scene, hallway, wallMaterial, floorMaterial, ceilingMaterial) {
    const room1 = this.rooms[hallway.from];
    const room2 = this.rooms[hallway.to];
    
    const wallThickness = this.wallThickness;
    const halfRoomSize = room1.size / 2; // Assuming same size rooms

    // Calculate hallway start and end (from centre of room1 wall to *center* of room2 wall)
    let startX, startZ, endX, endZ;

    if (hallway.direction === 'horizontal') {
      // Horizontal hallway (east-west)
      if (room2.position.x > room1.position.x) {
        // Room2 is to the east of room1
        startX = room1.position.x + halfRoomSize;
        endX = room2.position.x - halfRoomSize;
      } else {
        // Room2 is to the west of room1
        startX = room1.position.x - halfRoomSize;
        endX = room2.position.x + halfRoomSize;
      }
      startZ = endZ = room1.position.z; // Aligned horizontally
    } else {
      // Vertical hallway (north-south)
      if (room2.position.z > room1.position.z) {
        // Room2 is north of room1
        startZ = room1.position.z + halfRoomSize;
        endZ = room2.position.z - halfRoomSize;
      } else {
        // Room2 is south of room1
        startZ = room1.position.z - halfRoomSize;
        endZ = room2.position.z + halfRoomSize;
      }
      startX = endX = room1.position.x; // Aligned vertically
    }

    // length = distance between wall *centers*
    const length = hallway.direction === 'horizontal' 
      ? Math.abs(endX - startX) 
      : Math.abs(endZ - startZ);
    
    // centerX/Z = midpoint between wall *centers*
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;

    // Only build hallway if there's actual distance between rooms
    if (length < 0.5) {
      return; // Rooms are adjacent, no hallway needed
    }
    
    // --- Hallway floor ---
    const floorWidth = hallway.direction === 'horizontal' ? length : this.hallwayWidth;
    const floorDepth = hallway.direction === 'horizontal' ? this.hallwayWidth : length;
    
    const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial.clone());

    // Apply floor texture with proper tiling
    if (this.textures.floor) {
        applyTextureToMaterial(this.textures.floor, floor.material, floorWidth, floorDepth, this.theme, 'floor');
    }

    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, 0, centerZ);
    scene.add(floor);

    // --- Hallway walls (left and right) ---
    
    // The wall needs to span from the *inner* face of one wall to the *inner* face
    // of the other, so its length must be (center-to-center distance + wallThickness).
    const wallLength = length + wallThickness; 

    // Use wallLength for the dimension parallel to the hallway
    const wallWidth = hallway.direction === 'horizontal' ? wallLength : wallThickness;
    const wallDepth = hallway.direction === 'horizontal' ? wallThickness : wallLength;
    
    const wallGeometry = new THREE.BoxGeometry(
      wallWidth,
      this.wallHeight,
      wallDepth
    );

    // For texturing, we need the dimensions of the face we see.
    const textureFaceWidth = hallway.direction === 'horizontal' ? wallWidth : wallDepth;
    const textureFaceHeight = this.wallHeight;

    // Left wall
    const leftMaterial = wallMaterial.clone();
    if(this.textures.wall) {
      applyTextureToMaterial(
        this.textures.wall, 
        leftMaterial, 
        textureFaceWidth,
        textureFaceHeight,
        this.theme, 
        'wall'
      );
    }
    const leftWall = new THREE.Mesh(wallGeometry, leftMaterial);
    leftWall.position.set(
      centerX + (hallway.direction === 'vertical' ? -this.hallwayWidth / 2 : 0),
      this.wallHeight / 2,
      centerZ + (hallway.direction === 'horizontal' ? -this.hallwayWidth / 2 : 0)
    );
    scene.add(leftWall);
    this.collisionGroup.add(leftWall);

    // Right wall
    const rightMaterial = wallMaterial.clone();
    if(this.textures.wall) {
        applyTextureToMaterial(
            this.textures.wall, 
            rightMaterial, 
            textureFaceWidth,
            textureFaceHeight,
            this.theme, 
            'wall'
        );
    }
    const rightWall = new THREE.Mesh(wallGeometry, rightMaterial);
    rightWall.position.set(
      centerX + (hallway.direction === 'vertical' ? this.hallwayWidth / 2 : 0),
      this.wallHeight / 2,
      centerZ + (hallway.direction === 'horizontal' ? this.hallwayWidth / 2 : 0)
    );
    scene.add(rightWall);
    this.collisionGroup.add(rightWall);

    // --- Ceiling ---
    const ceilingMaterialClone = ceilingMaterial.clone();
    const ceilingTexture = this.textures.ceiling || this.textures.wall;
    if (ceilingTexture) {
        applyTextureToMaterial(ceilingTexture, ceilingMaterialClone, floorWidth, floorDepth, this.theme, 'ceiling');
    }
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterialClone);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(centerX, this.wallHeight, centerZ);
    scene.add(ceiling);
  }

  // WALL TRIM STUFF
  addWallTrim(scene, room) {
    const halfSize = room.size / 2;
    const trimDepth = 0.12;  // How far trim sticks out from wall
    
    // Baseboard height (bottom trim)
    const baseboardHeight = 0.15;
    const baseboardY = baseboardHeight / 2;
    
    // Crown molding height (top trim)
    const crownHeight = 0.12;
    const crownY = this.wallHeight - (crownHeight / 2);
    
    // Get doorway info
    const doorways = this.getDoorwaysForRoom(room);
    const doorwayWidth = this.hallwayWidth;
    const segmentWidth = (room.size - doorwayWidth) / 2;
    const offset = (room.size / 2 - segmentWidth / 2); // Offset from center for segments
    
    // Material for trim (slightly different color than walls)
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8f8f0,  // Slightly lighter/whiter than walls
      roughness: 0.7,
      metalness: 0.05,
    });

    // Helper function to create trim piece
    const createTrim = (width, height, x, y, z, rotationY = 0) => {
      // Don't create trim segments that are too small
      if (width < 0.1) return null; 
      const geometry = new THREE.BoxGeometry(width, height, trimDepth);
      const mesh = new THREE.Mesh(geometry, trimMaterial);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotationY;
      scene.add(mesh);
      return mesh;
    };

    // North wall trim
    const northZ = room.position.z + halfSize - trimDepth / 2;
    if (doorways.north) {
      // Left segment (west side of doorway)
      createTrim(segmentWidth, baseboardHeight, room.position.x - offset, baseboardY, northZ, 0);
      createTrim(segmentWidth, crownHeight, room.position.x - offset, crownY, northZ, 0);
      // Right segment (east side of doorway)
      createTrim(segmentWidth, baseboardHeight, room.position.x + offset, baseboardY, northZ, 0);
      createTrim(segmentWidth, crownHeight, room.position.x + offset, crownY, northZ, 0);
    } else {
      // Full wall
      createTrim(room.size, baseboardHeight, room.position.x, baseboardY, northZ, 0);
      createTrim(room.size, crownHeight, room.position.x, crownY, northZ, 0);
    }
    
    // South wall trim
    const southZ = room.position.z - halfSize + trimDepth / 2;
    if (doorways.south) {
      // Left segment (west side of doorway)
      createTrim(segmentWidth, baseboardHeight, room.position.x - offset, baseboardY, southZ, 0);
      createTrim(segmentWidth, crownHeight, room.position.x - offset, crownY, southZ, 0);
      // Right segment (east side of doorway)
      createTrim(segmentWidth, baseboardHeight, room.position.x + offset, baseboardY, southZ, 0);
      createTrim(segmentWidth, crownHeight, room.position.x + offset, crownY, southZ, 0);
    } else {
      // Full wall
      createTrim(room.size, baseboardHeight, room.position.x, baseboardY, southZ, 0);
      createTrim(room.size, crownHeight, room.position.x, crownY, southZ, 0);
    }
    
    // East wall trim
    const eastX = room.position.x + halfSize - trimDepth / 2;
    const rotEast = Math.PI / 2;
    if (doorways.east) {
      // Left segment (south side of doorway)
      createTrim(segmentWidth, baseboardHeight, eastX, baseboardY, room.position.z - offset, rotEast);
      createTrim(segmentWidth, crownHeight, eastX, crownY, room.position.z - offset, rotEast);
      // Right segment (north side of doorway)
      createTrim(segmentWidth, baseboardHeight, eastX, baseboardY, room.position.z + offset, rotEast);
      createTrim(segmentWidth, crownHeight, eastX, crownY, room.position.z + offset, rotEast);
    } else {
      // Full wall
      createTrim(room.size, baseboardHeight, eastX, baseboardY, room.position.z, rotEast);
      createTrim(room.size, crownHeight, eastX, crownY, room.position.z, rotEast);
    }
    
    // West wall trim
    const westX = room.position.x - halfSize + trimDepth / 2;
    const rotWest = Math.PI / 2;
    if (doorways.west) {
      // Left segment (south side of doorway)
      createTrim(segmentWidth, baseboardHeight, westX, baseboardY, room.position.z - offset, rotWest);
      createTrim(segmentWidth, crownHeight, westX, crownY, room.position.z - offset, rotWest);
      // Right segment (north side of doorway)
      createTrim(segmentWidth, baseboardHeight, westX, baseboardY, room.position.z + offset, rotWest);
      createTrim(segmentWidth, crownHeight, westX, crownY, room.position.z + offset, rotWest);
    } else {
      // Full wall
      createTrim(room.size, baseboardHeight, westX, baseboardY, room.position.z, rotWest);
      createTrim(room.size, crownHeight, westX, crownY, room.position.z, rotWest);
    }
  }
  // hallway wall trim adder, uses create trim like normal room stuff
  addHallwayTrim(scene, hallway) {
      const room1 = this.rooms[hallway.from];
      const room2 = this.rooms[hallway.to];
      
      const wallThickness = this.wallThickness;
      const halfRoomSize = room1.size / 2;
  
      let startX, startZ, endX, endZ;
  
      if (hallway.direction === 'horizontal') {
          startX = (room2.position.x > room1.position.x) ? room1.position.x + halfRoomSize : room1.position.x - halfRoomSize;
          endX = (room2.position.x > room1.position.x) ? room2.position.x - halfRoomSize : room2.position.x + halfRoomSize;
          startZ = endZ = room1.position.z;
      } else {
          startZ = (room2.position.z > room1.position.z) ? room1.position.z + halfRoomSize : room1.position.z - halfRoomSize;
          endZ = (room2.position.z > room1.position.z) ? room2.position.z - halfRoomSize : room2.position.z + halfRoomSize;
          startX = endX = room1.position.x;
      }
  
      const length = hallway.direction === 'horizontal' ? Math.abs(endX - startX) : Math.abs(endZ - startZ);
      const centerX = (startX + endX) / 2;
      const centerZ = (startZ + endZ) / 2;
  
      if (length < 0.5) return;
  
      const wallLength = length + wallThickness;
      
      const trimDepth = 0.12;
      const baseboardHeight = 0.15;
      const baseboardY = baseboardHeight / 2;
      const crownHeight = 0.12;
      const crownY = this.wallHeight - (crownHeight / 2);
  
      const trimMaterial = new THREE.MeshStandardMaterial({
          color: 0xf8f8f0,
          roughness: 0.7,
          metalness: 0.05,
      });
  
      const createTrim = (width, height, x, y, z, rotationY = 0) => {
          if (width < 0.1) return null;
          const geometry = new THREE.BoxGeometry(width, height, trimDepth);
          const mesh = new THREE.Mesh(geometry, trimMaterial);
          mesh.position.set(x, y, z);
          mesh.rotation.y = rotationY;
          scene.add(mesh);
          return mesh;
      };

      if (hallway.direction === 'horizontal') {
          // Left wall (north side)
          createTrim(wallLength, baseboardHeight, centerX, baseboardY, centerZ - this.hallwayWidth / 2 + trimDepth / 2, 0);
          createTrim(wallLength, crownHeight, centerX, crownY, centerZ - this.hallwayWidth / 2 + trimDepth / 2, 0);
          // Right wall (south side)
          createTrim(wallLength, baseboardHeight, centerX, baseboardY, centerZ + this.hallwayWidth / 2 - trimDepth / 2, 0);
          createTrim(wallLength, crownHeight, centerX, crownY, centerZ + this.hallwayWidth / 2 - trimDepth / 2, 0);
      } else { // Vertical
          // Left wall (west side)
          createTrim(wallLength, baseboardHeight, centerX - this.hallwayWidth / 2 + trimDepth / 2, baseboardY, centerZ, Math.PI / 2);
          createTrim(wallLength, crownHeight, centerX - this.hallwayWidth / 2 + trimDepth / 2, crownY, centerZ, Math.PI / 2);
          // Right wall (east side)
          createTrim(wallLength, baseboardHeight, centerX + this.hallwayWidth / 2 - trimDepth / 2, baseboardY, centerZ, Math.PI / 2);
          createTrim(wallLength, crownHeight, centerX + this.hallwayWidth / 2 - trimDepth / 2, crownY, centerZ, Math.PI / 2);
      }
  }
}

export default GalleryGenerator;

