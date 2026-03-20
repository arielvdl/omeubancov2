# App Store Screenshots - O Meu Banco

Guide for generating and maintaining Apple App Store promotional screenshots for O Meu Banco, a children's financial education app.

---

## Specifications

| Property        | Value                          |
|-----------------|--------------------------------|
| Display target  | iPhone 6.7"                    |
| Dimensions      | 1290 x 2796 pixels             |
| Total screens   | 4                              |
| Output path     | `assets/store/appstore_screenshot_X.png` |

---

## Design System

### Background

Generated via **Vertex AI Imagen 3** using style transfer from a reference banking app screenshot.

| Parameter       | Value                              |
|-----------------|------------------------------------|
| Model           | `imagen-3.0-capability-001`        |
| Region          | `us-central1`                      |
| Reference type  | `REFERENCE_TYPE_STYLE`             |
| Reference image | `aaaa.jpg` (Spruce banking app style) |
| Result          | Organic yellow curves on beige background |
| Selected output | `assets/store/bg_v2.png`           |

> API credentials are stored in environment variables. Never commit keys to version control.

### iPhone Mockup (Programmatic)

The phone frame is rendered programmatically with Pillow, matching iPhone 16 Pro proportions.

| Property       | Value                |
|----------------|----------------------|
| Bezel          | 22px                 |
| Outer radius   | 75px                 |
| Inner radius   | 58px                 |
| Dynamic Island | 155 x 48px, centered |
| Frame color    | `rgb(18, 18, 20)`    |
| Edge color     | `rgb(55, 55, 58)`    |
| Rotation       | 5 degrees            |
| Position       | Centered horizontally, bleeding past bottom edge |
| Shadow         | Drop shadow with `GaussianBlur(50)` |

### Typography

| Element   | Font                      | Size   | Extra              |
|-----------|---------------------------|--------|--------------------|
| Headline  | Bebas Neue Regular        | 180pt  | --                 |
| Subtitle  | Plus Jakarta Sans Medium  | 42pt   | line_spacing 1.45  |
| Tag       | Plus Jakarta Sans SemiBold| 30pt   | Inside yellow pill |

Fonts are sourced from Google Fonts (GitHub releases). The Bebas Neue `.ttf` file must be available locally for the generation script.

### Colors

| Role      | Hex       | Usage                        |
|-----------|-----------|------------------------------|
| Yellow    | `#f5e63d` | Pill tag background, accents |
| BG        | `#f8f8f5` | Fallback background          |
| Text      | `#282828` | Headlines, primary text      |
| Subtitle  | `#646464` | Secondary descriptive text   |

> Rule: Yellow backgrounds always use black text, never white.

### Layout Composition

1. **Logo** -- top-left corner, 90px from edges
2. **Yellow pill tag** -- top-right, contains category label
3. **Headline** -- left-aligned, large Bebas Neue text
4. **Subtitle** -- below headline with 50px gap, Plus Jakarta Sans
5. **Phone mockup** -- centered below text block, rotated 5 degrees, bottom edge bleeds off canvas

---

## Screenshot Plan

### Screenshot 1 -- Home Screen (Single Phone)

- **Headline:** MESADA FACIL E DIVERTIDA
- **App screen:** Home view showing greeting ("Ola, Sofia!") and balance
- **Layout:** Single phone, standard composition

### Screenshot 2 -- Statement / History (Single Phone)

- **Headline:** TUDO SOB CONTROLE
- **App screen:** Extrato (transaction history)
- **Layout:** Single phone, standard composition

### Screenshot 3 -- Deposit and Schedule (Dual Phone)

- **Headline:** TBD (parent features)
- **App screens:** "Alterar saldo" (deposit) + "Agendar deposito" (schedule)
- **Layout:** Two phones side by side, parent-focused features

### Screenshot 4 -- Contract and Withdraw (Dual Phone)

- **Headline:** TBD (educational rules)
- **App screens:** "Contrato do Banco" (bank contract) + "Registrar saque" (withdrawal)
- **Layout:** Two phones side by side, educational features

---

## Source App Screenshots

Captured from the simulator/device, stored in Downloads, sorted by capture time:

| Order | Time     | Screen                  | Used In        |
|-------|----------|-------------------------|----------------|
| 1     | 5:53 PM  | Home (Ola, Sofia! EUR 255) | Screenshot 1 |
| 2     | 5:54 PM  | Extrato (history)       | Screenshot 2   |
| 3     | 5:55:00  | Registrar saque         | Screenshot 4   |
| 4     | 5:55:40  | Alterar saldo (deposit) | Screenshot 3   |
| 5     | 5:56:09  | Agendar deposito        | Screenshot 3   |
| 6     | 5:56:43  | Contrato do Banco       | Screenshot 4   |

---

## Generation Script

### Location

The generation script should live at `scripts/generate_store_screenshots.py`. It was originally prototyped at `/tmp/generate_store_v6.py`.

### Dependencies

```
pip install Pillow
```

### Required Files

| File                              | Purpose                       |
|-----------------------------------|-------------------------------|
| `assets/store/bg_v2.png`         | AI-generated background       |
| Font: Bebas Neue Regular `.ttf`  | Headline typography           |
| Font: Plus Jakarta Sans `.ttf`   | Subtitle and tag typography   |
| App screenshots (PNG)            | Phone screen content          |

### Running

```bash
python scripts/generate_store_screenshots.py
```

Output files are written to `assets/store/appstore_screenshot_X.png` where X is 1 through 4.

---

## Required Sizes for App Store Connect

The current pipeline produces iPhone 6.7" screenshots only. The following sizes are needed for full App Store coverage:

| Device            | Dimensions      | Status     |
|-------------------|-----------------|------------|
| iPhone 6.7"       | 1290 x 2796    | Done       |
| iPhone 6.5"       | 1284 x 2778    | Pending    |
| iPhone 5.5"       | 1242 x 2208    | Pending    |
| iPad Pro 12.9"    | 2048 x 2732    | Pending    |
| iPad Pro 11"      | 1668 x 2388    | Pending    |

To support additional sizes, the generation script should accept a `--size` parameter or iterate over a size configuration list to produce all variants in a single run.

---

## Maintenance Notes

- When the app UI changes significantly, recapture the source screenshots and regenerate.
- The Vertex AI background only needs regeneration if the visual brand changes. `bg_v2.png` is the current selected variant.
- Keep font files in a shared location (e.g., `assets/fonts/`) if they are used by other tooling.
- All generated assets in `assets/store/` should be committed to version control since they are static outputs, not build artifacts.
