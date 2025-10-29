'use client';

import { useEffect, useState } from 'react';

export default function ImageGen() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_ARTWORKS_URL || '/artworks.json';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load artworks: ${response.status}`);
      }
      
      const data = await response.json();
      setArtworks(data.artworks || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading artworks:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return { artworks, loading };
}
