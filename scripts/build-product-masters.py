#!/usr/bin/env python3
"""Build staging-owned AI BioTech product masters from approved source artwork.

This script is used only by the one-time review-branch promotion workflow. It
creates 1:1 transparent Vial/Pen masters and exact Vial colour masks. Runtime
code must consume the generated review assets and must not fetch the source
project.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BUILD = ROOT / ".master-build"
SIZE = 512


def largest_foreground_alpha(image: Image.Image) -> np.ndarray:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    supplied_alpha = rgba[:, :, 3]
    if supplied_alpha.min() < 250:
        alpha = supplied_alpha
    else:
        rgb = rgba[:, :, :3].astype(np.int16)
        corners = np.stack(
            [rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]], axis=0
        )
        background = np.median(corners, axis=0)
        distance = np.max(np.abs(rgb - background), axis=2)
        raw = (distance > 9).astype(np.uint8) * 255
        raw = cv2.morphologyEx(
            raw,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)),
            iterations=2,
        )
        count, labels, stats, _ = cv2.connectedComponentsWithStats(raw, 8)
        if count < 2:
            raise RuntimeError("No product foreground was detected")
        component = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        alpha = (labels == component).astype(np.uint8) * 255
        flood = alpha.copy()
        flood_mask = np.zeros((alpha.shape[0] + 2, alpha.shape[1] + 2), np.uint8)
        cv2.floodFill(flood, flood_mask, (0, 0), 255)
        alpha = cv2.bitwise_or(alpha, cv2.bitwise_not(flood))

    alpha = cv2.morphologyEx(
        alpha,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
    )
    return cv2.GaussianBlur(alpha, (0, 0), 1.2)


def transparent_square(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    rgba = np.asarray(image, dtype=np.uint8).copy()
    rgba[:, :, 3] = largest_foreground_alpha(image)
    result = Image.fromarray(rgba, "RGBA")
    return result.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def image_svg(label: str, image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=90, method=6)
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" '
        f'viewBox="0 0 {SIZE} {SIZE}" preserveAspectRatio="xMidYMid meet" '
        f'role="img" aria-label="{label}">\n'
        f'  <image x="0" y="0" width="{SIZE}" height="{SIZE}" '
        'preserveAspectRatio="xMidYMid meet" '
        f'href="data:image/webp;base64,{payload}"/>\n'
        '</svg>\n'
    )


def exact_orange_mask(image: Image.Image, y_start: float, y_end: float) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    orange = (
        (hsv[:, :, 0] >= 2)
        & (hsv[:, :, 0] <= 32)
        & (hsv[:, :, 1] >= 70)
        & (hsv[:, :, 2] >= 28)
    )
    rows = np.zeros(orange.shape, dtype=bool)
    start = max(0, int(orange.shape[0] * y_start))
    end = min(orange.shape[0], int(orange.shape[0] * y_end))
    rows[start:end, :] = True
    raw = (orange & rows).astype(np.uint8) * 255
    raw = cv2.morphologyEx(
        raw,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
    )
    raw = cv2.dilate(
        raw, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1
    )
    raw = cv2.GaussianBlur(raw, (0, 0), 1.4)
    raw = cv2.resize(raw, (SIZE, SIZE), interpolation=cv2.INTER_AREA)
    rgba = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    rgba[:, :, :3] = 255
    rgba[:, :, 3] = raw
    return Image.fromarray(rgba, "RGBA")


def mask_svg(mask: Image.Image) -> str:
    buffer = io.BytesIO()
    mask.save(buffer, "PNG", optimize=True)
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" '
        f'viewBox="0 0 {SIZE} {SIZE}" aria-hidden="true">\n'
        f'  <image x="0" y="0" width="{SIZE}" height="{SIZE}" '
        f'href="data:image/png;base64,{payload}"/>\n'
        '</svg>\n'
    )


def write_text(path: Path, value: str) -> None:
    path.write_text(value, encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    vial_source = BUILD / "vial-source.png"
    pen_source = BUILD / "pen-source.png"
    if not vial_source.exists() or not pen_source.exists():
        raise FileNotFoundError("Approved source files were not downloaded")

    vial_original = Image.open(vial_source).convert("RGBA")
    vial = transparent_square(vial_source)
    pen = transparent_square(pen_source)

    write_text(ASSETS / "vial-master-v4.svg", image_svg("AI BioTech Vial master", vial))
    write_text(ASSETS / "pen-master-v4.svg", image_svg("AI BioTech Pen master", pen))

    # Normalized source bands are tied to the approved Vial artwork:
    # cap 0–18%, stopper 18–36%, strength block 53–68%.
    masks = {
        "vial-cap-mask.svg": exact_orange_mask(vial_original, 0.00, 0.18),
        "vial-stopper-mask.svg": exact_orange_mask(vial_original, 0.18, 0.36),
        "vial-strength-mask.svg": exact_orange_mask(vial_original, 0.53, 0.68),
    }
    for filename, mask in masks.items():
        write_text(ASSETS / filename, mask_svg(mask))

    for filename in (
        "vial-master-v4.svg",
        "pen-master-v4.svg",
        "vial-cap-mask.svg",
        "vial-stopper-mask.svg",
        "vial-strength-mask.svg",
    ):
        text = (ASSETS / filename).read_text(encoding="utf-8")
        if 'viewBox="0 0 512 512"' not in text:
            raise RuntimeError(f"{filename} is not a 1:1 512 coordinate asset")
    print("PASS: generated staging-owned product master assets")


if __name__ == "__main__":
    main()
