# Solar Router F1ATB — Copilot Instructions

Routeur photovoltaïque (solar diversion router) firmware for ESP32, sold/documented at
https://f1atb.fr/fr. It reads grid import/export power from one of many sources and drives
relay/SSR/Triac outputs to divert surplus PV production into loads (water heater, heating, etc.).

## Build

This is a plain **Arduino IDE sketch**, not a PlatformIO/CMake/arduino-cli project — there is no
build script, task runner, test suite, or linter in the repo.

- Board: ESP32 (Wroom, WT32-ETH01, ESP32-ETH01...). Requires the ESP32 Arduino core; per the
  changelog in `README.md`, core **v3.0.0 is known-buggy (+20% code size) — use v3.0.1+**.
- Partition table: must select the **custom partition scheme from `partitions.csv`** (custom
  `app0`/`app1`/`spiffs` layout) in Arduino IDE board settings — a mismatched partition scheme has
  historically broken the watchdog.
- Extra compiler flags live in `build_opt.h` (currently `-Wno-missing-field-initializers`), picked
  up automatically by the Arduino IDE from the sketch folder.
- Libraries required (see `#include`s at the top of `Solar_Router_V17_25.ino`): `WiFi`, `ESPmDNS`,
  `WebServer`, `ArduinoOTA`, `PubSubClient`, `DallasTemperature`, `UrlEncode`, `Update`,
  `EthernetESP32`, `FS`/`LittleFS`, `ArduinoJson`, plus the vendored `OneWire.cpp/.h` (a modified
  copy — comment warns it is *not* the same as the Arduino Library Manager version despite sharing
  a version number).
- There is no automated test/lint step; validate changes by compiling in Arduino IDE for an ESP32
  target and, where possible, flashing to real/dev hardware.

## Architecture

- **Single sketch, many `.ino` files**: the Arduino IDE concatenates all `.ino` files in the folder
  and auto-generates prototypes, so functions across `.ino` files can call each other without
  header declarations. `Solar_Router_V17_25.ino` is the entry point (`setup()`/`loop()`) and owns
  almost all global state (arrays, `Action` instances, timers, etc.).
- **Runtime source selection, not compile-time**: all `Source_*.ino` files (Linky, UxI, UxIx2,
  UxIx3/JSY, Enphase Envoy, Shelly EM/Pro EM, SmartG, HomeWizard, Zendure 3CT, MQTT, external ESP,
  NotDef) are always compiled in. Which one is active is decided at runtime by comparing the
  `Source` string (loaded from config) in `if (Source == "...")` chains in `setup()` /
  `Task_LectureRMS()` in the main `.ino` — each source exposes a `Setup_X()` and a `LectureX()`
  function called from there (some sources, like Zendure 3CT/HomeWizard/Shelly, need no `Setup_X()`
  since they require no auth/init beyond the generic external IP field, `RMSextIP`).
  When adding a new measurement source, follow this pattern: new `Source_X.ino` file with
  `Setup_X()`/`LectureX()`, then wire it into the dispatch chains in the main sketch.
- **Dual-core split**: measurement acquisition runs in `Task_LectureRMS()`, pinned to core 0 via
  `xTaskCreatePinnedToCore`. `loop()` (default core 1) handles the web server, Telnet, MQTT, OTA,
  timers and the `Action` state machine. Keep this split in mind — anything touching shared power
  variables (e.g. `PuissanceS_M`, `PuissanceI_T`) is written by the core-0 task and read by core 1.
- **`Action` class** (`Actions.h`/`Actions.cpp`) models one controllable output (relay/SSR/Triac):
  per-time-slot thresholds (`Vmin`/`Vmax`/`Hdeb`/`Hfin`/`Tinf`/`Tsup`...) sized for up to 8 periods,
  regulation modes (`MODE_DECOUPE_ONOFF`, `MODE_MULTISINUS`, `MODE_TRAINSINUS`, `MODE_PWM`,
  `MODE_DEMISINUS`, defined in the main `.ino`), and support for conditioning an action on the
  state of another action on the same or a remote ESP32 (multi-router setups, `RMS_*` arrays,
  "RMS" = "Routeur Multi Sources"). It also supports a per-period température-based safety override
  (`TinfForce`/`TsupForce`, hysteresis) that forces a relay in Routage mode (`Type==3`) to 100%
  opening when temperature drops too low, reusing the existing "On forcé" code path.
- **Web UI**: `PageXxx.h` files hold full HTML pages as raw C string literals
  (`R"====( ... )===="`), `JS_Xxx.h`/`PageHtmlJS_Xxx.h` hold matching JS/CSS fragments. Routes are
  wired in `Init_Server()` in `Server.ino` via `server.on("/path", handler)`; handlers for a given
  page are grouped in the corresponding `.ino`/`.h` pair (e.g. `PageActions.h` + `handleActions*`
  in `Server.ino`). AJAX endpoints (`/ajax_*`) return JSON for the page's periodic refresh.
- **Persistence**: `Stockage.ino` centralizes storage. Configuration is JSON in
  `/parametres.json` on LittleFS (`RecordFichierParametres`/`ReadFichierParametres`/
  `DeserializeConfiguration`), daily energy counters in `/EnergieMinuit.eng`, and long-term history
  in per-month files managed by `Record_Data` (oldest month auto-deleted when LittleFS fills up).
  Import/export of settings goes through `ImportParametres`/`Export` handlers as JSON blobs.
- **Watchdog is fragile**: comments in the main `.ino` and the README changelog describe
  repeated regressions where the ESP32 task watchdog (`esp_task_wdt_*`) crashed slave ESP32s or
  interacted badly with the FLASH partition layout; it is deliberately de-initialized then
  reconfigured at the top of `setup()`. Be conservative about changing this sequence.

## Conventions

- **Code, comments, and UI strings are in French** (variable/function names like `LesActions`,
  `EnergieQuotidienne`, `handleActions`, `RAZ` = "remise à zéro" i.e. reset). Match this language
  for new identifiers and comments in this codebase.
- **Versioning**: bump `#define Version "X.Y"` at the top of `Solar_Router_V17_25.ino` and add a
  dated entry to the "Historique des versions" section in `README.md` (French, one bullet list per
  version) for any user-visible or behavioral change — this is the project's only changelog.
- Global config knobs (buffer sizes, mode enums, memory offsets like `adr_HistoAn`) are `#define`d
  near the top of the main `.ino`; several are annotated "Ne pas toucher" (don't touch) because the
  JavaScript/web UI depends on the exact value (e.g. `LES_ACTIONS_LENGTH`, `LES_ROUTEURS_MAX`).
- Fixed-point/scaled integers are common instead of floats for storage (e.g. temperatures stored
  `*10`, hours stored as `Hdeci*100`) — preserve the existing scale when touching related code.

## Origin / provenance

This folder is a **git clone** of https://github.com/Gurvan99/Solar-Router-F1ATB_enphase
(branch `optimise-enphase-envoy`), which already contains prior work reusing TLS connections and
caching the Enlighten session-id cookie for the Enphase Envoy source (commit
"Enphase: réutilisation TLS + cache sessionId cookie + optimisations mémoire"). It superseded an
earlier, non-git-tracked working copy of the same project
(`Solar_Router_V17_27` / `Solar-Router-F1ATB-optimise-enphase-envoy`) used earlier in this session —
prefer this git-tracked clone going forward so changes are diffable and traceable.
