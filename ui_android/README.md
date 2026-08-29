# Android UI layer

`ui_android` will host the mobile application, camera barcode-scanning view, and local download/share handling for exported files. Shared resolution and export contracts belong outside this directory.

## Setup

1. Install the current Android Studio stable release and Android SDK.
2. Create or open the Android application project in this directory.
3. Configure a physical device or emulator with camera permissions.
4. Connect the scan flow to `core` services and use Android storage APIs for exported files.

## Inputs and outputs

Inputs: camera frames, manual barcode entry, user export actions, and storage permissions. Outputs: normalized barcode requests, product-metadata views, and user-accessible export files.

## Roadmap

Create the Android project, implement camera scanning and permission states, add offline cache access, and test downloads across supported Android versions.
