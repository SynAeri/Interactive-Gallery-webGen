import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tight">
            Liminal Gallery
          </h1>
          <p className="text-xl text-gray-400 max-w-lg mx-auto">
            Cool Gallery thingo
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Link
            href="/gallery"
            className="bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-all transform hover:scale-105 shadow-lg"
          >
            Enter Gallery
          </Link>
          <Link
            href="/about"
            className="border border-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all"
          >
            About
          </Link>
        </div>

        <div className="pt-12 text-sm text-gray-500">
          <p>Best experienced in fullscreen</p>
        </div>
      </div>
    </div>
  );
}
