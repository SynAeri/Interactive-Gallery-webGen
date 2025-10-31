# InteractiveGalleryGen - Interactive 3D Art Gallery
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A super cool system, aimed at autogeneration of images and hallways inspired from prims algorithm, did some artistic license and did a liminal backstreets hallway type of atmosphere

## Features

*Desktop Experience*

- Interactive 3D Gallery: Walk through a procedurally liminal looking space with a nonchalant looking gallery
- First-Person Controls: WASD movement with pointer-lock navigation (can very rarely break, if so reset [will fix maybe later])
- Lighting: fog and light thingy on top is pretty bright, contributions are welcome if you want to make it brighter
- Real-time Rendering: Powered by threejs it kind of lags sometimes at the start but it works

*Mobile Experience*

- Responsive Slideshow: carousel interface showing gallery in json format.
- Automatic Device Detection: switches experiences to slideshow option (Since I did not program a mobile option for use Sorry >_<)

*Core Features*

- Analytics Tracking: Visit counter with Neon PostgreSQL backend
- JSON-based Content: Easy artwork management via JSON configuration
- Modular Architecture: Clean component structure for easy customisation
