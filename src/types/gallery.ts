export interface GalleryImage {
  id: string;  // Unique ID
  url: string; // Image source
  title: string; // Display of gallery name
  position: {x: number; y: number; }; // gallery position
  scale: number;   // Size multiplier for custom portrait size(s)

}
