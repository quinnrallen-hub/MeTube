# Maintainer: Quinn Allen <quinn@example.com>

pkgname=metube-git
pkgver=r3.b85d370
pkgrel=1
pkgdesc="Ad-free YouTube desktop client built with Electron"
arch=('x86_64')
url="https://github.com/quinnrallen-hub/MeTube"
license=('MIT')
depends=('electron')
makedepends=('npm' 'git')
provides=('metube')
conflicts=('metube')
source=("git+https://github.com/quinnrallen-hub/MeTube.git")
sha256sums=('SKIP')

pkgver() {
    cd "${srcdir}/MeTube"
    printf "r%s.%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}

prepare() {
    cd "${srcdir}/MeTube"

    # Install dependencies
    npm install --cache "${srcdir}/npm-cache"
}

build() {
    cd "${srcdir}/MeTube"

    # Build the application (AppImage only)
    npx electron-builder --linux AppImage --cache "${srcdir}/npm-cache"
}

package() {
    cd "${srcdir}/MeTube"

    # Install the AppImage
    install -Dm755 "dist/YouTube Ad-Free-1.0.0.AppImage" "${pkgdir}/usr/bin/metube"

    # Install desktop file
    install -Dm644 /dev/stdin "${pkgdir}/usr/share/applications/metube.desktop" << EOF
[Desktop Entry]
Name=MeTube
Comment=Ad-free YouTube client
Exec=metube
Icon=metube
Terminal=false
Type=Application
Categories=AudioVideo;Video;Network;
Keywords=youtube;video;streaming;
StartupWMClass=MeTube
EOF

    # Install README as documentation
    install -Dm644 README.md "${pkgdir}/usr/share/doc/${pkgname%-git}/README.md"
}
