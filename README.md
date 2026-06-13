# react-native-pixel-launch

Pixel Launcher-style animations for React Native and Expo — overlay transitions, dialogs, bottom sheets, and a dome footer with FAB menu.

## Preview

![Pixel Launch Demo](<./Simulator Screen Recording - iPhone 17 Pro Max - 2026-06-08 at 10.21.54 (1).gif>)

## Features

- **PixelLaunchContainer** — Full-screen overlay that scales from any element (like Android's Pixel Launcher app-open animation)
- **PixelDialog** — Custom alert dialog that expands from an origin point to screen center
- **AnimatedBottomSheet** — Bottom sheet with pixel-style scale animation + stagger items
- **DomeFooter** — SVG dome bar footer with circular FAB button cutout
- **FabMenu** — Expandable floating action button menu with staggered spring animations
- Runs on the native thread (`useNativeDriver: true`) for smooth 60/120 Hz
- Works with both Expo and bare React Native
- TypeScript support built-in
- Zero required dependencies (only `react` and `react-native`)
- Optional `react-native-svg` peer dependency (only needed for `DomeFooter`)

## Installation

```bash
npm install react-native-pixel-launch
# or
yarn add react-native-pixel-launch
```

If you want to use `DomeFooter` / `FabMenu`, also install:

```bash
npm install react-native-svg
```

---

## Components

### 1. PixelLaunchContainer

Full-screen overlay that scales up from an origin rect and collapses back on close.

```tsx
import { useState, useRef } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { PixelLaunchContainer, type LaunchOrigin } from "react-native-pixel-launch";

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

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `visible` | `boolean` | Yes | — | Controls open/close state |
| `origin` | `LaunchOrigin \| null` | Yes | — | Screen-absolute rect of the trigger element |
| `onClose` | `() => void` | Yes | — | Called when user wants to close |
| `onDismissed` | `() => void` | No | — | Called after close animation completes |
| `backgroundColor` | `string` | No | `"#FFFFFF"` | Overlay background colour |
| `children` | `ReactNode` | Yes | — | Content rendered inside the overlay |

---

### 2. PixelDialog

Custom dialog that replaces native Alert — scales from an origin point to screen center.

```tsx
import { PixelDialog } from "react-native-pixel-launch";

<PixelDialog
  visible={showDialog}
  origin={dialogOrigin}
  title="Delete Item?"
  message="This action cannot be undone."
  icon={<MyIcon />}
  buttons={[
    { label: "Cancel", style: "cancel", onPress: () => setShowDialog(false) },
    { label: "Delete", style: "destructive", onPress: handleDelete },
  ]}
  onDismiss={() => setShowDialog(false)}
/>
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `visible` | `boolean` | Yes | — | Controls visibility |
| `origin` | `LaunchOrigin \| null` | Yes | — | Origin rect of trigger element |
| `title` | `string` | Yes | — | Dialog title |
| `message` | `string` | No | — | Body text below title |
| `icon` | `ReactNode` | No | — | Icon rendered above the title |
| `buttons` | `PixelDialogButton[]` | Yes | — | Array of buttons |
| `onDismiss` | `() => void` | No | — | Called on backdrop tap |

#### PixelDialogButton

```ts
type PixelDialogButton = {
  label: string;
  style?: "default" | "cancel" | "destructive";
  onPress: () => void;
};
```

---

### 3. AnimatedBottomSheet

Bottom sheet with pixel-style scale animation and stagger items.

```tsx
import { AnimatedBottomSheet, StaggerItem } from "react-native-pixel-launch";

<AnimatedBottomSheet
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Options"
  bottomOffset={80}
  originX={buttonCenterX}
>
  <StaggerItem index={0}><Text>Row 1</Text></StaggerItem>
  <StaggerItem index={1}><Text>Row 2</Text></StaggerItem>
  <StaggerItem index={2}><Text>Row 3</Text></StaggerItem>
</AnimatedBottomSheet>
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `visible` | `boolean` | Yes | — | Controls open/close |
| `onClose` | `() => void` | Yes | — | Called on backdrop tap or swipe down |
| `title` | `string` | No | — | Header title |
| `bottomOffset` | `number` | No | `0` | Distance from screen bottom (e.g. footer height) |
| `originX` | `number` | No | center | X position the sheet scales from |
| `maxHeightRatio` | `number` | No | `0.80` | Max height as fraction of screen |
| `children` | `ReactNode` | No | — | Sheet content |

---

### 4. DomeFooter

SVG dome bar footer with circular cutout for a floating action button.

```tsx
import { DomeFooter, FOOTER_BAR_H } from "react-native-pixel-launch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";

function MyFooter() {
  const insets = useSafeAreaInsets();
  const barH = FOOTER_BAR_H + insets.bottom;

  return (
    <DomeFooter
      barH={barH}
      primaryColor="#483D8B"
      footerColor="rgba(72, 61, 139, 0.28)"
      brandText="My App"
      onToggleFab={() => setFabOpen(true)}
      isFabOpen={fabOpen}
      onCloseSheet={() => {}}
      renderIcon={(name) => (
        <Icon name={name} size={28} color="#FFF" />
      )}
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `barH` | `number` | Yes | — | Total bar height (FOOTER_BAR_H + safe area) |
| `primaryColor` | `string` | Yes | — | Brand colour for FAB button |
| `footerColor` | `string` | Yes | — | Footer bar background colour |
| `brandText` | `string` | No | `""` | Text shown on the footer bar |
| `onBack` | `() => void` | No | — | Sub-screen mode: shows close button |
| `isSheetOpen` | `boolean` | No | `false` | Whether a sheet overlay is open |
| `isFabOpen` | `boolean` | No | `false` | Whether the FAB menu is open |
| `isMenuOpen` | `boolean` | No | `false` | Whether the menu is open |
| `onCloseSheet` | `() => void` | No | — | Close sheet callback |
| `onToggleFab` | `() => void` | No | — | Toggle FAB menu callback |
| `onCloseMenu` | `() => void` | No | — | Close menu callback |
| `renderIcon` | `(name) => ReactNode` | No | — | Custom icon renderer |

---

### 5. FabMenu

Expandable floating action button menu with staggered spring animations.

```tsx
import { FabMenu, BTN_R } from "react-native-pixel-launch";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";

<FabMenu
  isOpen={fabOpen}
  bottomOffset={barH}
  primaryColor="#483D8B"
  items={[
    {
      key: "menu",
      icon: <Icon name="menu" size={22} color="#FFF" />,
      label: "Menu Items",
      onPress: () => openMenu(),
    },
    {
      key: "settings",
      icon: <Icon name="cog" size={22} color="#FFF" />,
      label: "Settings",
      onPress: () => openSettings(),
    },
  ]}
  onClose={() => setFabOpen(false)}
/>
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | — | Controls menu visibility |
| `bottomOffset` | `number` | Yes | — | Distance from screen bottom |
| `primaryColor` | `string` | Yes | — | Colour for FAB buttons |
| `items` | `FabMenuItem[]` | Yes | — | Menu items to display |
| `onClose` | `() => void` | Yes | — | Close callback |

---

## LaunchOrigin type

```ts
type LaunchOrigin = {
  x: number;      // pageX from ref.measure()
  y: number;      // pageY from ref.measure()
  width: number;
  height: number;
};
```

Get these values using `ref.measure()` on the trigger element — see the usage examples above.

## Exported Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `FOOTER_BAR_H` | `56` | Footer bar height (without safe area) |
| `DOME_R` | `50` | Dome radius |
| `DOME_CX` | `screenWidth - 58` | Dome center X position |
| `BTN_R` | `30` | FAB button radius |
| `CUP_RIM_R` | `39` | Dome cutout rim radius |

## License

MIT — made by [Sourabh Patidar](https://github.com/Saurabh0904)
