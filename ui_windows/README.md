# Windows UI layer

`ui_windows` will host the native desktop application, USB barcode-scanner integration, and USB thermal-printer mappings. Keep metadata contracts and provider logic in shared modules.

## Setup

1. Install Visual Studio 2022 or later with the selected desktop-development workload.
2. Install the runtime and SDK selected for the Windows application implementation.
3. Connect scanner and printer devices, then confirm their OS-level drivers and permissions.
4. Configure the application to consume `core` services and `models` contracts rather than device-specific data shapes.

## Inputs and outputs

Inputs: scanner events, user lookup/export actions, and printer settings. Outputs: display-ready metadata, export requests, printable labels, and actionable peripheral errors.

## Roadmap

Create the desktop project, add HID/serial scanner adapters, define printer profiles, and add hardware-in-the-loop test guidance.
