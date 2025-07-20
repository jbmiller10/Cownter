"""Helper functions for creating test images with EXIF data."""

import io
from datetime import datetime

import piexif
from PIL import Image


def create_test_jpeg_with_exif(
    width: int = 800,
    height: int = 600,
    color: tuple[int, int, int] = (255, 0, 0),
    capture_time: datetime | None = None,
) -> io.BytesIO:
    """
    Create a test JPEG image with EXIF data.

    Args:
    ----
        width: Image width in pixels
        height: Image height in pixels
        color: RGB color tuple
        capture_time: Optional capture time for EXIF

    Returns:
    -------
        BytesIO object containing JPEG image with EXIF

    """
    # Create image
    img = Image.new("RGB", (width, height), color)

    # Create EXIF data
    exif_dict = {"0th": {}, "Exif": {}}

    # Add basic EXIF fields
    exif_dict["0th"][piexif.ImageIFD.Make] = b"Test Camera"
    exif_dict["0th"][piexif.ImageIFD.Model] = b"Test Model"
    exif_dict["0th"][piexif.ImageIFD.Software] = b"Test Software"

    # Add capture time if provided
    if capture_time:
        datetime_str = capture_time.strftime("%Y:%m:%d %H:%M:%S").encode()
        exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = datetime_str
        exif_dict["Exif"][piexif.ExifIFD.DateTimeDigitized] = datetime_str

    # Convert to bytes
    exif_bytes = piexif.dump(exif_dict)

    # Save image with EXIF
    output = io.BytesIO()
    img.save(output, format="JPEG", exif=exif_bytes)
    output.seek(0)

    return output


def create_test_jpeg_without_exif(
    width: int = 800,
    height: int = 600,
    color: tuple[int, int, int] = (0, 255, 0),
) -> io.BytesIO:
    """
    Create a test JPEG image without EXIF data.

    Args:
    ----
        width: Image width in pixels
        height: Image height in pixels
        color: RGB color tuple

    Returns:
    -------
        BytesIO object containing JPEG image

    """
    img = Image.new("RGB", (width, height), color)
    output = io.BytesIO()
    img.save(output, format="JPEG")
    output.seek(0)
    return output


def create_test_png(
    width: int = 800,
    height: int = 600,
    color: tuple[int, int, int] = (0, 0, 255),
) -> io.BytesIO:
    """
    Create a test PNG image (for testing invalid format).

    Args:
    ----
        width: Image width in pixels
        height: Image height in pixels
        color: RGB color tuple

    Returns:
    -------
        BytesIO object containing PNG image

    """
    img = Image.new("RGB", (width, height), color)
    output = io.BytesIO()
    img.save(output, format="PNG")
    output.seek(0)
    return output


def create_large_jpeg(size_mb: int = 15) -> io.BytesIO:  # noqa: ARG001
    """
    Create a large JPEG for testing file size limits.

    Args:
    ----
        size_mb: Target size in megabytes

    Returns:
    -------
        BytesIO object containing large JPEG

    """
    # Create a very large image with a pattern that doesn't compress well
    dimension = 4000  # Large enough to exceed 10MB even with compression

    # Create image with noisy pattern
    img = Image.new("RGB", (dimension, dimension))
    pixels = img.load()

    # Fill with a pattern that doesn't compress well
    import random
    random.seed(42)  # For reproducibility

    for x in range(0, dimension, 10):  # Sample every 10 pixels for speed
        for y in range(0, dimension, 10):
            # Create random colors
            r = random.randint(0, 255)  # noqa: S311
            g = random.randint(0, 255)  # noqa: S311
            b = random.randint(0, 255)  # noqa: S311
            # Fill a 10x10 block with this color
            for dx in range(10):
                for dy in range(10):
                    if x + dx < dimension and y + dy < dimension:
                        pixels[x + dx, y + dy] = (r, g, b)

    output = io.BytesIO()
    # Save with high quality and no optimization to ensure large file
    img.save(output, format="JPEG", quality=100, optimize=False)
    output.seek(0)

    return output
