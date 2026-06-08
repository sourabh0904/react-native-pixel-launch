# react-native-pixel-launch

Pixel Launcher-style scale-from-origin overlay animation for React Native and Expo.

Opens a full-screen overlay that scales up from any element on screen (like Android's Pixel Launcher app-open animation), and collapses back on close.

## Preview

![Pixel Launch Demo](<./Simulator Screen Recording - iPhone 17 Pro Max - 2026-06-08 at 10.21.54 (1).gif>)

## Features

- Scales from any screen element to full screen
- Circular reveal on open, collapses back on close
- Runs on the native thread (`useNativeDriver: true`) for smooth 60/120 Hz performance
- Works with both Expo and bare React Native
- TypeScript support built-in
- Zero dependencies (only `react` and `react-native`)

## Installation

```bash
npm install react-native-pixel-launch
# or
yarn add react-native-pixel-launch
```

## Usage

```tsx
import { useState, useRef } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import {
  PixelLaunchContainer,
  type LaunchOrigin,
} from "react-native-pixel-launch";

export default function App() {
  const [visible, setVisible] = useState(false);
  const [origin, setOrigin]   = useState<LaunchOrigin | null>(null);
  const btnRef                = useRef<View>(null);

  const handleOpen = () => {
    btnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setOrigin({ x: pageX, y: pageY, width, height });
      setVisible(true);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity ref={btnRef} onPress={handleOpen}>
        <Text>Open</Text>
      </TouchableOpacity>

      <PixelLaunchContainer
        visible={visible}
        origin={origin}
        onClose={() => setVisible(false)}
        onDismissed={() => console.log("fully closed")}
        backgroundColor="#FFFFFF"
      >
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Your screen content here</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </PixelLaunchContainer>
    </View>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `visible` | `boolean` | Yes | — | Controls open/close state |
| `origin` | `LaunchOrigin \| null` | Yes | — | Screen-absolute rect of the trigger element |
| `onClose` | `() => void` | Yes | — | Called when user wants to close |
| `onDismissed` | `() => void` | No | — | Called after close animation completes |
| `backgroundColor` | `string` | No | `"#FFFFFF"` | Overlay background colour |
| `children` | `ReactNode` | Yes | — | Content rendered inside the overlay |

## LaunchOrigin type

```ts
type LaunchOrigin = {
  x: number;      // pageX from ref.measure()
  y: number;      // pageY from ref.measure()
  width: number;
  height: number;
};
```

Get these values using `ref.measure()` on the trigger element — see the usage example above.

## License

MIT — made by [Sourabh Patidar](https://github.com/Saurabh0904)
# react-native-pixel-launch-
# sourabh0904-react-native-pixel-launch
# sourabh0904-react-native-pixel-launch
# sourabh0904-react-native-pixel-launch
# react-native-pixel-launch
