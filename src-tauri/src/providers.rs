//! Bring-your-own-key model calls for Claude, OpenAI, and Microsoft Foundry.
//! Every call optionally carries a base64 PNG screenshot so the model can *see*
//! the user's screen (vision), which is stronger and more robust than OCR.
//!
//! Foundry uses the modern GA OpenAI-compatible route:
//!   POST {endpoint}/openai/v1/chat/completions   (header: api-key, body: model=deployment)

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProviderCfg {
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub model: String,
    // Foundry / Azure only:
    #[serde(default)]
    pub endpoint: String,
    #[serde(default)]
    pub deployment: String,
    #[serde(default)]
    pub api_version: String,
}

const MAX_TOKENS: u32 = 1500;

fn client() -> reqwest::Client {
    reqwest::Client::new()
}

// ---------- Claude (Anthropic) ----------

pub async fn call_anthropic(
    cfg: &ProviderCfg,
    system: &str,
    user: &str,
    image_b64: Option<&str>,
) -> Result<String, String> {
    if cfg.api_key.trim().is_empty() {
        return Err("No Claude API key set. Open settings and paste your Anthropic key.".into());
    }
    let model = if cfg.model.is_empty() { "claude-sonnet-4-6" } else { &cfg.model };

    let mut content: Vec<Value> = Vec::new();
    if let Some(b64) = image_b64 {
        content.push(json!({
            "type": "image",
            "source": { "type": "base64", "media_type": "image/png", "data": b64 }
        }));
    }
    content.push(json!({ "type": "text", "text": user }));

    let body = json!({
        "model": model,
        "max_tokens": MAX_TOKENS,
        "system": system,
        "messages": [{ "role": "user", "content": content }]
    });

    let resp = client()
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", cfg.api_key.trim())
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error reaching Anthropic: {e}"))?;

    let status = resp.status();
    let v: Value = resp.json().await.map_err(|e| format!("Bad Anthropic response: {e}"))?;
    if !status.is_success() {
        return Err(api_error("Claude", &v));
    }
    v["content"][0]["text"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| "Claude returned an unexpected response.".into())
}

// ---------- OpenAI ----------

pub async fn call_openai(
    cfg: &ProviderCfg,
    system: &str,
    user: &str,
    image_b64: Option<&str>,
) -> Result<String, String> {
    if cfg.api_key.trim().is_empty() {
        return Err("No OpenAI API key set. Open settings and paste your OpenAI key.".into());
    }
    let model = if cfg.model.is_empty() { "gpt-4o" } else { &cfg.model };
    let user_content = openai_style_content(user, image_b64);

    let body = json!({
        "model": model,
        "max_tokens": MAX_TOKENS,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user_content }
        ]
    });

    let resp = client()
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(cfg.api_key.trim())
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error reaching OpenAI: {e}"))?;

    let status = resp.status();
    let v: Value = resp.json().await.map_err(|e| format!("Bad OpenAI response: {e}"))?;
    if !status.is_success() {
        return Err(api_error("OpenAI", &v));
    }
    v["choices"][0]["message"]["content"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| "OpenAI returned an unexpected response.".into())
}

// ---------- Microsoft Foundry (Azure, OpenAI-compatible /openai/v1) ----------

pub async fn call_foundry(
    cfg: &ProviderCfg,
    system: &str,
    user: &str,
    image_b64: Option<&str>,
) -> Result<String, String> {
    if cfg.api_key.trim().is_empty() {
        return Err("No Foundry API key set. Add your Azure key in settings.".into());
    }
    if cfg.endpoint.trim().is_empty() || cfg.deployment.trim().is_empty() {
        return Err("Foundry needs an endpoint and a deployment name (see settings).".into());
    }

    let base = cfg.endpoint.trim().trim_end_matches('/');
    // Modern GA OpenAI-compatible path. The deployment name goes in the body as `model`.
    let url = format!("{base}/openai/v1/chat/completions");
    let user_content = openai_style_content(user, image_b64);

    let body = json!({
        "model": cfg.deployment.trim(),
        "max_tokens": MAX_TOKENS,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user_content }
        ]
    });

    let resp = client()
        .post(&url)
        .header("api-key", cfg.api_key.trim())
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error reaching Foundry: {e}"))?;

    let status = resp.status();
    let v: Value = resp.json().await.map_err(|e| format!("Bad Foundry response: {e}"))?;
    if !status.is_success() {
        return Err(api_error("Foundry", &v));
    }
    v["choices"][0]["message"]["content"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| "Foundry returned an unexpected response.".into())
}

// ---------- helpers ----------

/// OpenAI / Foundry message content: text, plus an optional inline image.
fn openai_style_content(user: &str, image_b64: Option<&str>) -> Value {
    match image_b64 {
        Some(b64) => json!([
            { "type": "text", "text": user },
            { "type": "image_url", "image_url": { "url": format!("data:image/png;base64,{b64}") } }
        ]),
        None => json!(user),
    }
}

fn api_error(name: &str, v: &Value) -> String {
    let msg = v["error"]["message"]
        .as_str()
        .or_else(|| v["message"].as_str())
        .unwrap_or("unknown error");
    format!("{name} rejected the request: {msg}")
}
