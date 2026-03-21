# App Store Screenshots - O Meu Banco

Guide for generating and maintaining App Store and Play Store promotional screenshots for O Meu Banco, a children's financial education app.

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

Solid flat yellow `#FFD600` (the project's primary brand color). No gradients, circles, or textures.

### iPhone Mockup (Programmatic)

The phone frame is rendered programmatically with Pillow, matching iPhone 16 Pro proportions.

| Property       | Value                |
|----------------|----------------------|
| Bezel          | 22px                 |
| Outer radius   | 75px                 |
| Inner radius   | 58px                 |
| Dynamic Island | Not rendered (already present in source screenshots) |
| Frame color    | `rgb(18, 18, 20)`    |
| Edge color     | `rgb(55, 55, 58)`    |
| Shadow         | Drop shadow with `GaussianBlur(45)`, opacity 60 |

| Property       | Value                |
|----------------|----------------------|
| Screen height  | 1814px               |
| Rotation       | 5 degrees            |
| Position       | Centered horizontally, bottom edge bleeds off canvas |

All 4 screenshots use single phone layout.

### Typography

| Element   | Font                      | Size   | Extra              |
|-----------|---------------------------|--------|--------------------|
| Headline  | Bebas Neue Regular        | 198pt  | line_spacing 1.1   |
| Subtitle  | Plus Jakarta Sans Medium  | 55pt   | line_spacing 1.5   |
| Tag       | Plus Jakarta Sans SemiBold| 34pt   | Inside white pill  |

Fonts sourced from:
- Bebas Neue: `assets/fonts/BebasNeue-Regular.ttf` (downloaded from Google Fonts)
- Plus Jakarta Sans: `node_modules/@expo-google-fonts/plus-jakarta-sans/`

### Colors

| Role      | Hex       | Usage                        |
|-----------|-----------|------------------------------|
| BG        | `#FFD600` | Flat yellow background       |
| Text      | `#1A1A1A` | Headlines, primary text      |
| Subtitle  | `#3D3D3D` | Secondary descriptive text   |
| Pill BG   | `#FFFFFF` | Tag pill background          |
| Pill Text | `#1A1A1A` | Tag pill text                |

> Rule: Yellow backgrounds always use black text, never white.

### Layout Composition

1. **Logo** -- top-left corner, 90px from edges, 120px size, rounded corners
2. **White pill tag** -- top-right, contains category label
3. **Headline** -- left-aligned, 90px left margin, starts at y=340
4. **Subtitle** -- below headline at y=740, Plus Jakarta Sans
5. **Phone mockup(s)** -- below text block, bottom edge bleeds off canvas

---

## Screenshot Plan

### Screenshot 1 -- Home Screen (Single Phone)

- **Headline:** MESADA FACIL E DIVERTIDA
- **Subtitle:** Ensine seus filhos a lidar com dinheiro de forma ludica e segura.
- **Pill:** EDUCACAO FINANCEIRA
- **App screen:** Home view showing greeting and balance (R$)
- **Layout:** Single phone

### Screenshot 2 -- Statement / History (Single Phone)

- **Headline:** TUDO SOB CONTROLE
- **Subtitle:** Acompanhe cada movimentacao com transparencia total.
- **Pill:** EXTRATO COMPLETO
- **App screen:** Extrato (transaction history)
- **Layout:** Single phone

### Screenshot 3 -- Automatic Allowance (Single Phone)

- **Headline:** MESADA AUTOMATICA
- **Subtitle:** Agende depositos diarios, semanais ou mensais.
- **Pill:** AREA DOS PAIS
- **App screen:** Agendar deposito
- **Layout:** Single phone

### Screenshot 4 -- Family Contract (Single Phone)

- **Headline:** REGRAS E RESPONSABILIDADE
- **Subtitle:** Contrato familiar com regras definidas pela familia.
- **Pill:** EDUCATIVO
- **App screen:** Contrato do Banco
- **Layout:** Single phone

---

## Source App Screenshots

Captured from device, stored in `~/Downloads`, matched by date+time in filename:

| Key            | Date       | Time     | Screen                     | Used In      |
|----------------|------------|----------|----------------------------|--------------|
| home           | 2026-03-20 | 3:02 PM  | Home (Ola, Oliver! R$ 451) | Screenshot 1 |
| extrato        | 2026-03-18 | 5:54 PM  | Extrato (history)          | Screenshot 2 |
| agendar        | 2026-03-20 | 3:05 PM  | Agendar deposito           | Screenshot 3 |
| contrato       | 2026-03-18 | 5:56 PM  | Contrato do Banco          | Screenshot 4 |

---

## Generation Script

### Location

`scripts/generate_store_screenshots.py`

### Dependencies

```
pip install Pillow
```

### Required Files

| File                                                  | Purpose                |
|-------------------------------------------------------|------------------------|
| `assets/fonts/BebasNeue-Regular.ttf`                 | Headline typography    |
| `node_modules/@expo-google-fonts/plus-jakarta-sans/` | Subtitle/tag typography|
| `assets/logos/icon-512.png`                           | App logo               |
| App screenshots in `~/Downloads` (PNG)               | Phone screen content   |

### Running

```bash
python scripts/generate_store_screenshots.py
```

Output: 4 screenshots x 4 sizes (3 iOS + 1 Android) = 16 files, plus 4 master copies at root.

---

## Output Sizes

The script generates all sizes in a single run from a master canvas (1290x2796). Scaling uses LANCZOS with center crop to exact dimensions.

### Apple App Store

| Device            | Dimensions      | Output path                        |
|-------------------|-----------------|-------------------------------------|
| iPhone 6.9"       | 1320 x 2868    | `assets/store/ios/iphone-6.9/`     |
| iPhone 6.7"       | 1290 x 2796    | `assets/store/ios/iphone-6.7/`     |
| iPhone 6.5"       | 1284 x 2778    | `assets/store/ios/iphone-6.5/`     |

### Google Play Store

| Device            | Dimensions      | Output path                        |
|-------------------|-----------------|-------------------------------------|
| Phone             | 1080 x 2340    | `assets/store/android/phone/`      |

Master copies also saved at `assets/store/appstore_screenshot_X.png`.

---

## Maintenance Notes

- When the app UI changes significantly, recapture source screenshots and regenerate.
- Keep font files in `assets/fonts/`.
- All generated assets in `assets/store/` should be committed to version control.
- The script matches screenshots by partial filename (date + time), handling Unicode characters in macOS filenames.
- To add new sizes, add an entry to the `SIZES` dict in the script.
