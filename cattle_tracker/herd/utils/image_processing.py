"""Image processing utilities for photo uploads."""

import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import piexif
from PIL import Image

try:
    import pyheif
    HEIC_SUPPORT = True
except ImportError:
    pyheif = None
    HEIC_SUPPORT = False
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.utils import timezone


def _decode_exif_value(value: Any) -> Any:
    """Decode EXIF value from bytes if needed."""
    if isinstance(value, bytes):
        try:
            decoded = value.decode("utf-8", errors="ignore")
            return decoded.strip("\x00")
        except (UnicodeDecodeError, AttributeError):
            return str(value)
    return value


def _process_exif_dict(exif_dict: dict[str, Any], exif_data: dict[str, Any]) -> None:
    """Process EXIF dictionary and update exif_data."""
    for ifd in ("0th", "Exif", "GPS", "1st"):
        if ifd in exif_dict:
            for tag, raw_value in exif_dict[ifd].items():
                tag_name = piexif.TAGS[ifd].get(tag, {}).get("name", str(tag))
                decoded_value = _decode_exif_value(raw_value)
                exif_data[tag_name] = decoded_value


def extract_exif_data(image_file: InMemoryUploadedFile | TemporaryUploadedFile) -> dict[str, Any]:
    """
    Extract EXIF data from uploaded image file.

    Supports JPEG and HEIC formats.

    Args:
    ----
        image_file: Uploaded image file

    Returns:
    -------
        Dictionary containing extracted EXIF data

    """
    exif_data = {}

    content_type = image_file.content_type
    image_file.seek(0)

    if content_type == "image/jpeg":
        try:
            exif_dict = piexif.load(image_file.read())
            _process_exif_dict(exif_dict, exif_data)
        except (ValueError, KeyError, TypeError):
            pass

    elif content_type == "image/heic" and HEIC_SUPPORT:
        try:
            heif_file = pyheif.read(image_file.read())
            if heif_file.metadata:
                for metadata in heif_file.metadata:
                    if metadata["type"] == "Exif":
                        exif_bytes = metadata["data"][6:]
                        exif_dict = piexif.load(exif_bytes)
                        _process_exif_dict(exif_dict, exif_data)
        except (ValueError, KeyError, TypeError, AttributeError):
            pass

    image_file.seek(0)
    return exif_data


def get_capture_time(exif_data: dict[str, Any]) -> datetime:
    """
    Extract capture time from EXIF data or use current time.

    Args:
    ----
        exif_data: Dictionary containing EXIF data

    Returns:
    -------
        Datetime object representing capture time

    """
    datetime_original = exif_data.get("DateTimeOriginal")

    if datetime_original:
        try:
            if isinstance(datetime_original, str):
                naive_time = datetime.strptime(datetime_original, "%Y:%m:%d %H:%M:%S")
                return timezone.make_aware(naive_time)
        except (ValueError, TypeError):
            pass

    return timezone.now()


def resize_image(
    image: Image.Image,
    max_size: tuple[int, int],
    quality: int = 85,
) -> io.BytesIO:
    """
    Resize image to fit within max_size while maintaining aspect ratio.

    Args:
    ----
        image: PIL Image object
        max_size: Maximum width and height as tuple
        quality: JPEG quality (1-100)

    Returns:
    -------
        BytesIO object containing resized image

    """
    rgb_image = image.convert("RGB")

    rgb_image.thumbnail(max_size, Image.Resampling.LANCZOS)

    output = io.BytesIO()
    rgb_image.save(output, format="JPEG", quality=quality, optimize=True)
    output.seek(0)

    return output


def convert_heic_to_pil(image_file: InMemoryUploadedFile | TemporaryUploadedFile) -> Image.Image:
    """
    Convert HEIC image to PIL Image object.

    Args:
    ----
        image_file: Uploaded HEIC image file

    Returns:
    -------
        PIL Image object

    Raises:
    ------
        ValueError: If HEIC support is not available

    """
    if not HEIC_SUPPORT:
        msg = "HEIC support is not available. Please install pyheif."
        raise ValueError(msg)

    image_file.seek(0)
    heif_file = pyheif.read(image_file.read())
    image = Image.frombytes(
        heif_file.mode,
        heif_file.size,
        heif_file.data,
        "raw",
        heif_file.mode,
        heif_file.stride,
    )
    image_file.seek(0)
    return image


def save_image_derivatives(
    original_file: InMemoryUploadedFile | TemporaryUploadedFile,
    capture_time: datetime,
) -> dict[str, str]:
    """
    Save original image and create display/thumbnail derivatives.

    Args:
    ----
        original_file: Uploaded image file
        capture_time: Datetime when photo was captured

    Returns:
    -------
        Dictionary with paths to original, display, and thumbnail images

    """
    photo_uuid = uuid.uuid4()
    date_path = capture_time.strftime("%Y/%m")
    base_path = Path(settings.MEDIA_ROOT) / date_path / str(photo_uuid)
    base_path.mkdir(parents=True, exist_ok=True)

    content_type = original_file.content_type
    original_file.seek(0)

    if content_type == "image/jpeg":
        image = Image.open(original_file)
    elif content_type == "image/heic":
        image = convert_heic_to_pil(original_file)
    else:
        msg = f"Unsupported image format: {content_type}"
        raise ValueError(msg)

    original_file.seek(0)
    original_path = base_path / f"original_{original_file.name}"
    with original_path.open("wb") as f:
        for chunk in original_file.chunks():
            f.write(chunk)

    display_io = resize_image(image, (1280, 1280), quality=90)
    display_path = base_path / "display_1280.jpg"
    with display_path.open("wb") as f:
        f.write(display_io.getvalue())

    thumb_io = resize_image(image, (300, 300), quality=85)
    thumb_path = base_path / "thumb_300.jpg"
    with thumb_path.open("wb") as f:
        f.write(thumb_io.getvalue())

    media_root_str = str(settings.MEDIA_ROOT)

    return {
        "original": str(original_path).replace(media_root_str + "/", ""),
        "display": str(display_path).replace(media_root_str + "/", ""),
        "thumbnail": str(thumb_path).replace(media_root_str + "/", ""),
    }
