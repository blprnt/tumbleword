#!/bin/bash
# Run this script once from the project root to download external assets.
# p5.js is served from node_modules — run npm install first.
set -e

VIEWS=views

echo "Creating directories..."
mkdir -p "$VIEWS/img" "$VIEWS/fonts"

echo "Downloading Martian Mono font..."
curl -sL "https://fonts.gstatic.com/s/martianmono/v6/2V08KIcADoYhV6w87xrTKjs4CYElh_VS9YA4TlTnQzaVMIE6j15dYY3qu86W.ttf" -o "$VIEWS/fonts/MartianMono-ExtraLight.ttf"

echo ""
echo "Done!"
echo ""
echo "NOTE: The following assets need to be placed manually (original Glitch CDN is gone):"
echo "  views/favicon.ico"
echo "  views/apple-touch-icon.png"
echo "  views/favicon-32x32.png"
echo "  views/favicon-16x16.png"
echo "  views/img/WordWorm.gif"
echo "  views/img/WormWarm.gif"
echo "  views/img/CaviarAviary.gif"
echo "  views/img/tumbleweed_simple.svg"
echo "  views/img/tumbleweed_fill.svg"
