# ZenFocus 🧖‍♂️

**A Meditative, Sauna-Themed Focus Timer.**

ZenFocus is a desktop focus timer application that brings the calming atmosphere of a sauna to your productivity workflow. Built with **Tauri**, **React**, and **TypeScript**, it combines distraction-free time management with immersive visuals and sounds.

![ZenFocus Screenshot](public/screenshot.png)

## ✨ Features

* **Atmospheric "Sauna" Design**:
  * Dark wood grain aesthetic with ember-like gradients.
  * Dynamic steam particle animations that intensify during focus sessions.
  * Synthesized "Sizzle" steam sound effects upon timer completion.
  * Subtle ambient animations (heat haze, pulsing glows).

* **Intuitive Controls**:
  * **Scroll to Set Time**: Simply scroll your mouse wheel over the timer to adjust the duration (1-60 minutes).
  * **Hot Stone Button**: A tactile start/stop button that glows like a heated stone.
  * **Mini Mode**: Collapse the app into a compact, always-on-top window to save screen space.

* **Activity Tracking**:
  * **Daily Logs**: Track your total focus minutes for the day.
  * **Streak Counter**: Keep your momentum going with daily streak tracking.
  * **Session History**: Detailed log of recent focus sessions.

* **Privacy First**: All data is stored locally on your device.

## 📥 Download & Installation

You can download the latest version for Windows from the **[Releases Page](https://github.com/serge1102/ZenFocus/releases)**.

1. Download the `ZenFocus_..._x64-setup.exe` file.
2. Run the installer.
3. Launch ZenFocus and start condensing your focus.

## 📖 How to Use

1. **Set Time**: Hover over the timer circle and scroll up/down to set your desired minutes (default: 25m).
2. **Start Heating**: Click the large central button to start the timer.
3. **Focus**: The "steam" will rise, and the Ember ring will slowly deplete.
4. **Cool Down**: When the timer hits 0, a steam sound plays, and the session is logged to your history.
5. **Review**: Switch to the Calendar view (History icon) to see your daily stats and streaks.

## 🛠 Development

If you want to build this project from source:

### Prerequisites

* Node.js (v18+)
* Rust & Cargo (for Tauri)

### Setup

```bash
# Clone the repository
git clone https://github.com/serge1102/ZenFocus.git
cd ZenFocus

# Install dependencies
npm install

# Run in development mode
npm run dev
# In a separate terminal:
npm run tauri dev
```

### Build

To build the executable for production:

```bash
npm run tauri build
```

## 🏗 Tech Stack

* [Tauri v2](https://tauri.app/) - for the lightweight desktop runtime
* [React](https://react.dev/) - for the UI framework
* [TypeScript](https://www.typescriptlang.org/) - for type safety
* [Tailwind CSS](https://tailwindcss.com/) - for styling
* [Framer Motion](https://www.framer.com/motion/) - for smooth animations
* [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - for real-time sound synthesis
