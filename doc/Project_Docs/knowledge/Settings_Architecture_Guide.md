# Settings Architecture Guide

**Version:** 1.21.6  
**Last Updated:** October 7, 2025

## Overview

This document describes the architecture and save logic for the Settings window in Claude Code Fusion. Follow this guide when modifying or adding new settings.

---

## Architecture

### Backend (Extension)

**Location:** `src/extension-module/settings-module/`

```
SettingsFacade.ts              ← Main entry point
├── SettingsLoader.ts          ← Load from VS Code config
├── SettingsSaver.ts           ← Save to VS Code config  
└── SettingsResetter.ts        ← Reset to defaults
```

**Interface:**
```typescript
export interface ExtensionSettings {
  thinking: {
    enabled: boolean;
    maxTokens: number;
  };
}
```

### Frontend (React)

**Location:** `src/webview/ui/src/components/`

```
SettingsView.tsx               ← Main settings container
└── settings/
    └── ThinkingSettings.tsx   ← Thinking mode settings component
```

---

## Save Logic

### When Does "Save Changes" Button Appear?

**CRITICAL RULE:** The Save Changes button appears **ONLY** when settings that actually affect behavior change.

#### Current Implementation (v1.21.6)

**Thinking Settings:**
- Button appears: When `enabled` checkbox is toggled
- Button does NOT appear: When `maxTokens` changes while `enabled = false`

**Why?** Changing token values when thinking mode is disabled has no effect. Saving meaningless changes is illogical.

#### Implementation Details

```typescript
// SettingsView.tsx
const initialEnabled = React.useRef<boolean>(false);

// Track initial state on load
initialEnabled.current = loadedSettings.thinking.enabled;

// Only mark as changed if enabled checkbox changed
const enabledChanged = enabled !== initialEnabled.current;
setHasChanges(enabledChanged);
```

**Key Points:**
1. Use `useRef` to track initial value of meaningful settings
2. Compare current vs initial in `handleThinkingSettingsChange`
3. Only set `hasChanges = true` if meaningful settings changed
4. Update ref after successful save

---

## File Structure

### package.json

All settings MUST be registered in `package.json`:

```json
"contributes": {
  "configuration": {
    "title": "Claude Code Fusion",
    "properties": {
      "claudeCodeFusion.thinking.enabled": {
        "type": "boolean",
        "default": false,
        "description": "Enable thinking mode..."
      },
      "claudeCodeFusion.thinking.maxTokens": {
        "type": "number",
        "default": 4000,
        "minimum": 2000,
        "maximum": 32000,
        "description": "Maximum thinking tokens..."
      }
    }
  }
}
```

**IMPORTANT:** Settings not registered in `package.json` will fail to save with error:
```
Unable to write to User Settings because claudeCodeFusion.xxx is not a registered configuration
```

### Message Flow

```
UI (SettingsView)
  ↓ vscode.postMessage({ type: 'settings:save', settings })
MessageProviderRefactored
  ↓ settingsHandler.handleSettingsSave(settings)
SettingsHandler
  ↓ settingsFacade.saveSettings(settings)
SettingsFacade
  ↓ settingsSaver.save(settings)
SettingsSaver
  ↓ config.update(key, value, ConfigurationTarget.Global)
VS Code Configuration
```

---

## Adding New Settings

### 1. Add to package.json

```json
"claudeCodeFusion.newFeature.enabled": {
  "type": "boolean",
  "default": false,
  "description": "Enable new feature"
}
```

### 2. Update ExtensionSettings Interface

```typescript
// SettingsFacade.ts
export interface ExtensionSettings {
  thinking: { ... };
  newFeature: {    // ← Add here
    enabled: boolean;
  };
}
```

### 3. Update Loader

```typescript
// SettingsLoader.ts
const settings = {
  thinking: { ... },
  newFeature: {
    enabled: config.get<boolean>('newFeature.enabled', false)
  }
};
```

### 4. Update Saver

```typescript
// SettingsSaver.ts
if (settings.newFeature) {
  await this.updateSetting(config, 'newFeature.enabled',
    settings.newFeature.enabled);
}
```

### 5. Update Resetter

```typescript
// SettingsResetter.ts
await this.resetSetting(config, 'newFeature.enabled');
```

### 6. Create UI Component

```typescript
// NewFeatureSettings.tsx
interface NewFeatureSettingsProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}
```

### 7. Update SettingsView

```typescript
// SettingsView.tsx
const [settings, setSettings] = useState<Settings>({
  thinking: { ... },
  newFeature: { enabled: false }  // ← Add here
});

const handleNewFeatureChange = (enabled: boolean) => {
  setSettings({
    ...settings,
    newFeature: { enabled }
  });
  // Apply save logic rules here
  setHasChanges(true);
};
```

---

## Important Notes

### DO's
✅ Always register settings in `package.json` first  
✅ Use `useRef` to track initial state of meaningful settings  
✅ Only trigger Save Changes for settings that affect behavior  
✅ Validate settings before saving (in SettingsSaver)  
✅ Update all 4 classes: Loader, Saver, Resetter, Facade  
✅ Test save/load cycle after changes  

### DON'Ts
❌ Don't save settings not registered in package.json  
❌ Don't show Save Changes for cosmetic-only changes  
❌ Don't forget to update ExtensionSettings interface  
❌ Don't skip validation in SettingsSaver  
❌ Don't save settings when thinking mode is disabled (tokens example)  

---

## Fresh Config Pattern

**CRITICAL:** Always get fresh config when verifying saved values:

```typescript
// ❌ WRONG - uses cached config
await config.update(key, value, ConfigurationTarget.Global);
const savedValue = config.get(key);  // May return stale value

// ✅ CORRECT - get fresh config
await config.update(key, value, ConfigurationTarget.Global);
const freshConfig = vscode.workspace.getConfiguration(this.configurationSection);
const savedValue = freshConfig.get(key);  // Returns actual saved value
```

---

## Troubleshooting

### Settings Not Saving
1. Check `package.json` registration
2. Check console for errors: `[SettingsSaver] Error saving...`
3. Verify `config.update()` uses `ConfigurationTarget.Global`
4. Check VS Code settings.json manually

### Save Button Not Appearing
1. Check `hasChanges` logic in SettingsView
2. Verify `initialEnabled.current` is set on load
3. Check comparison logic in change handler

### Wrong Values After Load
1. Check SettingsLoader default values
2. Verify message handler in SettingsView applies defaults
3. Check `settings:loaded` message structure

---

**Reference Commits:**
- v1.21.4: Fix SDK settings blocking save (skip SDK save)
- v1.21.5: Remove Terminal Settings (cleanup)
- v1.21.6: Improve save logic (meaningful changes only)
