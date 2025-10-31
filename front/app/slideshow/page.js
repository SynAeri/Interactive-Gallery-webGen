'use client';

import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import Link from 'next/link';
import ImageGen from './components/image_gen';

export default function Slideshow() {
  const { artworks, loading } = ImageGen();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-2xl">Loading artworks...</div>
      </div>
    );
  }

  // No artworks
  if (artworks.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-2xl mb-4">No artworks found</div>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      
      <div className="container mx-auto">

        <div className="w-full mb-4 mt-5">
          <Link href="/" className="border border-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all">
            Back
          </Link>
        </div>

        <div className="p-4 md:p-8">
          <Splide
            options={{
              type: 'loop',
              perPage: 1,
              perMove: 1,
              gap: '2rem',
              pagination: true,
              arrows: true,
              autoplay: true,
              autoHeight: true,
              cover: false,
            }}
            aria-label="Gallery Artworks"
          >
            {artworks.map((artwork) => (
              <SplideSlide key={artwork.id}>
                <div className="flex flex-col items-center h-auto px-4 py-8">
                  
                  <div className="flex-shrink-0 mb-6 max-h-[50vh] w-full flex justify-center">
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                    />
                  </div>

                  <div className="bg-gray-800 rounded-2xl p-6 max-w-3xl w-full">
                    <h2 className="text-3xl font-bold mb-3 text-center">
                      {artwork.title}
                    </h2>
                    <p className="text-xl text-gray-300 mb-4 text-center">
                      {artwork.artist} • {artwork.year}
                    </p>
                    {artwork.description && (
                      <p className="text-gray-400 leading-relaxed text-center">
                        {artwork.description}
                      </p>
                    )}
                  </div>

                </div>
              </SplideSlide>
            ))}
          </Splide>
        </div>

      </div>
    </div>
  );
}
