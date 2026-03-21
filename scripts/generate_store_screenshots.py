#!/usr/bin/env python3
"""
Generate App Store / Play Store promotional screenshots for O Meu Banco.
Generates master at 1290x2796 then scales to all required store sizes.
Background: solid flat yellow #FFD600 with dark text for visibility.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


# ── Paths ──────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
STORE = ASSETS / "store"
FONTS = ASSETS / "fonts"
LOGOS = ASSETS / "logos"

FONT_HEADLINE = FONTS / "BebasNeue-Regular.ttf"
FONT_SUBTITLE = (
    ROOT
    / "node_modules/@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf"
)
FONT_SEMIBOLD = (
    ROOT
    / "node_modules/@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf"
)

# ── Colors ─────────────────────────────────────────────────────────────
YELLOW = "#FFD600"
TEXT_DARK = "#1A1A1A"
TEXT_SUBTITLE = "#3D3D3D"
PILL_BG = "#FFFFFF"
PILL_TEXT = "#1A1A1A"
PHONE_FRAME = (18, 18, 20)
PHONE_EDGE = (55, 55, 58)

# ── Master canvas (iPhone 6.7") ────────────────────────────────────────
MASTER_W = 1290
MASTER_H = 2796

# ── Phone mockup specs ─────────────────────────────────────────────────
BEZEL = 22
OUTER_RADIUS = 75
INNER_RADIUS = 58
ROTATION_DEG = 5

# ── Shared sizes ───────────────────────────────────────────────────────
SINGLE_PHONE_HEIGHT = 1814
HEADLINE_SIZE = 198
SUBTITLE_SIZE = 55
PILL_FONT_SIZE = 34
LOGO_SIZE = 120

# ── Output size variants ───────────────────────────────────────────────
SIZES = {
    # Apple App Store
    "ios/iphone-6.9": (1320, 2868),
    "ios/iphone-6.7": (1290, 2796),
    "ios/iphone-6.5": (1284, 2778),
    # Google Play Store
    "android/phone": (1080, 2340),
}


# ── Helpers ────────────────────────────────────────────────────────────

def rounded_rect_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size[0] - 1, size[1] - 1)], radius, fill=255)
    return mask


def create_phone_mockup(screen_img, scale_height=1400):
    aspect = screen_img.width / screen_img.height
    screen_h = scale_height
    screen_w = int(screen_h * aspect)
    screen = screen_img.resize((screen_w, screen_h), Image.LANCZOS)

    phone_w = screen_w + BEZEL * 2
    phone_h = screen_h + BEZEL * 2
    phone = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))

    edge_img = Image.new("RGBA", (phone_w, phone_h), (*PHONE_EDGE, 255))
    edge_mask = rounded_rect_mask((phone_w, phone_h), OUTER_RADIUS)
    phone.paste(edge_img, mask=edge_mask)

    inner_w = phone_w - 4
    inner_h = phone_h - 4
    inner_img = Image.new("RGBA", (inner_w, inner_h), (*PHONE_FRAME, 255))
    inner_mask = rounded_rect_mask((inner_w, inner_h), OUTER_RADIUS - 2)
    phone.paste(inner_img, (2, 2), mask=inner_mask)

    screen_rgba = screen.convert("RGBA")
    screen_mask = rounded_rect_mask((screen_w, screen_h), INNER_RADIUS)
    phone.paste(screen_rgba, (BEZEL, BEZEL), mask=screen_mask)

    return phone


def add_shadow(img, offset=(20, 20), blur=50, opacity=80):
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, opacity))
    shadow.paste(shadow_layer, mask=img.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))

    expand = blur * 2 + max(abs(offset[0]), abs(offset[1]))
    result = Image.new("RGBA", (img.width + expand * 2, img.height + expand * 2), (0, 0, 0, 0))
    result.paste(shadow, (expand + offset[0], expand + offset[1]), shadow.split()[3])
    result.paste(img, (expand, expand), img.split()[3])
    return result, expand


def draw_pill(draw, text, font, x, y, bg_color, text_color, padding_h=24, padding_v=12):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pill_w = tw + padding_h * 2
    pill_h = th + padding_v * 2
    radius = pill_h // 2
    draw.rounded_rectangle([(x, y), (x + pill_w, y + pill_h)], radius, fill=bg_color)
    draw.text((x + padding_h, y + padding_v - bbox[1]), text, font=font, fill=text_color)
    return pill_w, pill_h


def draw_multiline(draw, text, font, x, y, fill, line_spacing=1.45):
    lines = text.split("\n")
    current_y = y
    for line in lines:
        bbox = font.getbbox(line)
        line_h = bbox[3] - bbox[1]
        draw.text((x, current_y), line, font=font, fill=fill)
        current_y += int(line_h * line_spacing)
    return current_y


def draw_header(canvas, pill_text):
    draw = ImageDraw.Draw(canvas)

    logo = Image.open(LOGOS / "icon-512.png").convert("RGBA")
    logo = logo.resize((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
    logo_mask = rounded_rect_mask((LOGO_SIZE, LOGO_SIZE), 28)
    logo_bg = Image.new("RGBA", (LOGO_SIZE, LOGO_SIZE), (0, 0, 0, 0))
    logo_bg.paste(logo, mask=logo_mask)
    canvas.paste(logo_bg, (90, 120), logo_bg.split()[3])

    font_pill = ImageFont.truetype(str(FONT_SEMIBOLD), PILL_FONT_SIZE)
    bbox = font_pill.getbbox(pill_text)
    pill_tw = bbox[2] - bbox[0]
    pill_x = MASTER_W - 90 - pill_tw - 48
    draw_pill(draw, pill_text, font_pill, pill_x, 145, PILL_BG, PILL_TEXT)

    return draw


def place_single_phone(canvas, screenshot_path):
    screen = Image.open(screenshot_path).convert("RGBA")
    phone = create_phone_mockup(screen, scale_height=SINGLE_PHONE_HEIGHT)

    phone_rotated = phone.rotate(
        ROTATION_DEG, resample=Image.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0)
    )
    phone_shadow, expand = add_shadow(phone_rotated, offset=(15, 25), blur=45, opacity=60)

    phone_x = (MASTER_W - phone_shadow.width) // 2
    phone_y = MASTER_H - phone_shadow.height + expand + 200
    canvas.paste(phone_shadow, (phone_x, phone_y), phone_shadow.split()[3])


def find_screenshot(downloads, date_str, time_str):
    for f in downloads.iterdir():
        if date_str in f.name and time_str in f.name:
            return f
    return None


def save_all_sizes(master_canvas, screenshot_num):
    """Save a master canvas to all store size variants."""
    master_rgb = master_canvas.convert("RGB")

    for size_key, (w, h) in SIZES.items():
        out_dir = STORE / size_key
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"screenshot_{screenshot_num}.png"

        if w == MASTER_W and h == MASTER_H:
            master_rgb.save(out_path, "PNG", quality=95)
        else:
            # Scale maintaining aspect ratio, then crop/pad to exact size
            scale = max(w / MASTER_W, h / MASTER_H)
            scaled_w = int(MASTER_W * scale)
            scaled_h = int(MASTER_H * scale)
            scaled = master_rgb.resize((scaled_w, scaled_h), Image.LANCZOS)

            # Center crop to target
            left = (scaled_w - w) // 2
            top = (scaled_h - h) // 2
            cropped = scaled.crop((left, top, left + w, top + h))
            cropped.save(out_path, "PNG", quality=95)

        print(f"  {size_key}: {out_path}")

    # Also save master copy at root level
    root_path = STORE / f"appstore_screenshot_{screenshot_num}.png"
    master_rgb.save(root_path, "PNG", quality=95)


# ── Screenshot generators ──────────────────────────────────────────────

def generate_screenshot(num, screenshot_path, pill_text, headline, subtitle):
    """Generic single-phone screenshot generator."""
    canvas = Image.new("RGBA", (MASTER_W, MASTER_H), YELLOW)
    draw = draw_header(canvas, pill_text)

    font_h = ImageFont.truetype(str(FONT_HEADLINE), HEADLINE_SIZE)
    draw_multiline(draw, headline, font_h, 90, 340, TEXT_DARK, line_spacing=1.1)

    font_s = ImageFont.truetype(str(FONT_SUBTITLE), SUBTITLE_SIZE)
    draw_multiline(draw, subtitle, font_s, 90, 740, TEXT_SUBTITLE, line_spacing=1.5)

    place_single_phone(canvas, screenshot_path)

    print(f"\nScreenshot {num}:")
    save_all_sizes(canvas, num)


# ── Main ───────────────────────────────────────────────────────────────

SCREENSHOT_DEFS = [
    {
        "num": 1,
        "key": "home",
        "pill": "EDUCAÇÃO FINANCEIRA",
        "headline": "MESADA FÁCIL\nE DIVERTIDA",
        "subtitle": "Ensine seus filhos a lidar com\ndinheiro de forma lúdica e segura.",
    },
    {
        "num": 2,
        "key": "extrato",
        "pill": "EXTRATO COMPLETO",
        "headline": "TUDO SOB\nCONTROLE",
        "subtitle": "Acompanhe cada movimentação\ncom transparência total.",
    },
    {
        "num": 3,
        "key": "agendar",
        "pill": "ÁREA DOS PAIS",
        "headline": "MESADA\nAUTOMÁTICA",
        "subtitle": "Agende depósitos diários,\nsemanais ou mensais.",
    },
    {
        "num": 4,
        "key": "contrato",
        "pill": "EDUCATIVO",
        "headline": "REGRAS E\nRESPONSABILIDADE",
        "subtitle": "Contrato familiar com regras\ndefinidas pela família.",
    },
]


def main():
    STORE.mkdir(parents=True, exist_ok=True)
    downloads = Path.home() / "Downloads"

    screenshots = {
        "home": find_screenshot(downloads, "2026-03-20", "3.02.42"),
        "extrato": find_screenshot(downloads, "2026-03-18", "5.54.05"),
        "agendar": find_screenshot(downloads, "2026-03-20", "3.05.00"),
        "contrato": find_screenshot(downloads, "2026-03-18", "5.56.43"),
    }

    missing = [k for k, v in screenshots.items() if v is None]
    if missing:
        print(f"ERROR: Missing screenshots: {', '.join(missing)}")
        return

    for defn in SCREENSHOT_DEFS:
        generate_screenshot(
            defn["num"],
            screenshots[defn["key"]],
            defn["pill"],
            defn["headline"],
            defn["subtitle"],
        )

    print(f"\nDone! Generated {len(SCREENSHOT_DEFS)} screenshots x {len(SIZES)} sizes = {len(SCREENSHOT_DEFS) * len(SIZES)} files")


if __name__ == "__main__":
    main()
