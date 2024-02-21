<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

# Homebridge Somfy TaHoma stateless screens plugin

</span>

---
- This plugin allows to expose the Somfy TaHoma stateless screens.
The stateless screens don't show up in the TaHoma HomeKit bridge because they don't have a bidirectional radio. 
This plugin resolve the problem counting the time of the screen movement (see Usage section).

## Requirements

- A working setup of any of the TaHoma bridges (like the Connectivity kit).

## How to use it

- Using the Eve app or any of the HomeKit enabled apps that show custom characteristics set for all the screens in your 
setup the duration in seconds of the full movement (from full closed to full opened) and the duration of movement from 
full close to MY position. The plugin will use this data to determine the actual position of the screen.

- You can then ask Siri
```
Siri open the Living room blind
Siri close the Living room blind
Siri set the Living room blind to 70%
```
---