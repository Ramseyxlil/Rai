//! Screen capture. Grabs the primary monitor as a PNG and returns it base64-encoded,
//! ready to hand to a vision-capable model. We encode with the `png` crate directly
//! from raw RGBA bytes so we don't couple to xcap's internal `image` version.

use base64::{engine::general_purpose::STANDARD, Engine as _};

/// Capture the primary monitor and return a base64 PNG string.
pub fn capture_screen_png_b64() -> Result<String, String> {
    let monitors = xcap::Monitor::all().map_err(|e| format!("Could not list monitors: {e}"))?;
    let monitor = monitors
        .first()
        .ok_or_else(|| "No monitor found to capture.".to_string())?;

    let image = monitor
        .capture_image()
        .map_err(|e| format!("Screen capture failed: {e}"))?;

    let (w, h) = (image.width(), image.height());
    let raw = image.into_raw(); // RGBA8 bytes

    let mut png_bytes: Vec<u8> = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, w, h);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("PNG header error: {e}"))?;
        writer
            .write_image_data(&raw)
            .map_err(|e| format!("PNG encode error: {e}"))?;
    }

    Ok(STANDARD.encode(png_bytes))
}
