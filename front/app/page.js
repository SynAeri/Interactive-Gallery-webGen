'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FaGithub, FaLinkedin } from 'react-icons/fa'; 

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetch('/api/track', { method: 'POST' }); 
  }, []);

  useEffect(() => {
    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    setIsMobile(checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 items-center">
        
        <div className="w-full text-center space-y-8 lg:pr-2 lg:border-r lg:border-gray-700">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tight">
             Paint Your Neurodivergent Mind Virtual Showcase 
            </h1>
            <p className="text-xl text-gray-400 lg:mx-0">
             A virtual gallery of Paint Your Neurodivergen Mind 
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">


            <Menu as="div" className="relative">
              <Menu.Button className="bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 min-w-[200px] justify-between">
                <span>Enter Gallery</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden z-10 focus:outline-none">

                <Menu.Item>
                  {({ active, disabled }) => (
                    <Link
                      href="/gallery"
                      className={`block px-6 py-4 transition-colors duration-150 ${
disabled ? 'text-gray-500 cursor-not-allowed' : // Disabled state (no bg!)
active ? 'bg-gray-700 text-white' : 'text-white' // Active vs. Normal
                      }`}
                    >
                      <div className="font-semibold flex items-left gap-2 left-align">
                        Interactive 3D showcase
                        {isMobile && (
                          <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                            Desktop reccomended 
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/slideshow"
                      className={`block px-6 py-4 ${active ? 'bg-gray-700' : ''} text-white`}
                    >
                      <div className="font-semibold flex items-center justify-center gap-2">
                        Slideshow
                        {isMobile && (
                          <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                </Menu.Item>

              </Menu.Items>
            </Transition>
            </Menu>


            <Link
              href="https://github.com/SynAeri/Interactive-Gallery-webGen"
              className="border border-gray-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-all"
            >
              About
            </Link>
          </div>
          
          <div className="pt-12 text-sm text-gray-500">
            <p>Best experienced in fullscreen</p>
           
            <div className="py-5 flex gap-5 justify-center">

             
              <a
                href="https://github.com/SynAeri"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Profile"
                className="text-gray-500 p-2 bg-gray-800 rounded-full transition-all hover:text-white hover:bg-gray-700 transform hover:scale-110"
              >
                <FaGithub size={20} />
              </a>

             
              <a
                href="https://www.linkedin.com/feed/update/urn:li:activity:7386602642673872896/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn Profile"
                className="text-gray-500 p-2 bg-gray-800 rounded-full transition-all hover:text-white hover:bg-gray-700 transform hover:scale-110"
              >
                <FaLinkedin size={20} />
              </a>

            

            </div>
          </div>
        </div>

       <div className="flex flex-col gap-8 items-center lg:items-center lg:pl-4">
          <div className="bg-black-400 rounded-3xl p-8 shadow-2xl border border-gray-700 max-w-2xl">
            {/* Grid with 2 columns inside the box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

              {/* Left: QR Code */}
              <div className="flex justify-center">
                <div className="bg-white rounded-2xl p-4">
                  <img
                    src="/Online-QR-Code.png"
                    alt="QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </div>

              {/* Right: Description */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white">
                  Scan for the Survey :D
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Thank you for visiting the Paint Out Your <b>Neurodivergent Minds Gallery! </b> 
                We invite you to share your feedback by scanning the QR code or <a href="https://forms.gle/rNHTh5Lf7BbQETYD7" className="text-blue-400 font-semibold hover:text-blue-200">「Clicking on this link!」</a>
                </p>
                <p className="text-sm text-gray-400">
                  Complete the survey for a chance to win a <span className="text-yellow-400 font-semibold">$150 Prezzee gift card!</span>
                </p>
            </div>

          </div>
        </div>
        </div>




      </div>
    </div>
  )};
