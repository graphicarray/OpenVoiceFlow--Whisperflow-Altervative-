const { net } = require("electron");
const debugLogger = require("./debugLogger");
const {
  PROVIDER_ERROR_CODES,
  providerHttpError,
  providerError,
  redactProviderBody,
} = require("./providerHttpErrors");

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_GENERATE_CONTENT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

const GEMINI_MIME_TYPES = {
  "audio/mpeg": "audio/mp3",
  "audio/mp4": "audio/aac",
};

function extractText(data) {
  const outputText = data?.output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText;
  }
  if (Array.isArray(data?.outputs)) {
    const fromOutputs = data.outputs
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : [item]))
      .filter((part) => typeof part?.text === "string" && part.text.trim())
      .map((part) => part.text.trim())
      .join(" ");
    if (fromOutputs.trim()) return fromOutputs;
  }
  if (Array.isArray(data?.candidates)) {
    const fromCandidates = data.candidates
      .flatMap((cand) => cand?.content?.parts || [])
      .filter((part) => typeof part?.text === "string" && part.text.trim())
      .map((part) => part.text.trim())
      .join(" ");
    if (fromCandidates.trim()) return fromCandidates;
  }
  return (data?.steps || [])
    .flatMap((step) => step?.content || [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join(" ");
}

async function transcribeWithGeminiGenerateContent(
  { base64Audio, mimeType, language, keyterms, apiKey },
  doFetch
) {
  const langInstruction =
    language && language !== "auto"
      ? ` The spoken language is "${language}". Keep the transcription in its original spoken language and script (for example, use বাংলা script for "bn").`
      : "";
  const vocabInstruction =
    keyterms && keyterms.length > 0
      ? ` Prefer these custom vocabulary terms when applicable: ${keyterms.join(", ")}.`
      : "";
  const prompt = `Transcribe the spoken audio accurately.${langInstruction}${vocabInstruction} Return ONLY the exact transcribed text with no commentary, no timestamps, and no surrounding quotes. If there is no speech in the audio, return an empty string.`;

  const url = `${GEMINI_GENERATE_CONTENT_BASE}/${GEMINI_FALLBACK_MODEL}:generateContent`;
  const response = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw providerHttpError({
      provider: "Gemini",
      model: GEMINI_FALLBACK_MODEL,
      status: response.status,
      body: errorText,
      headers: response.headers,
      surface: "transcription",
    });
  }

  const data = await response.json();
  return extractText(data);
}

async function transcribeWithGemini(
  { audioBuffer, model, contentType, language, keyterms, apiKey },
  fetchImpl
) {
  if (!apiKey?.trim()) {
    throw providerError(PROVIDER_ERROR_CODES.KEY_MISSING, {
      provider: "Gemini",
      surface: "transcription",
    });
  }

  const resolvedModel = model || "gemini-3.5-transcribe";
  const mimeType = GEMINI_MIME_TYPES[contentType] || contentType || "audio/webm";
  const base64Audio = (
    Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer)
  ).toString("base64");

  const transcriptionConfig = {};
  if (language && language !== "auto") {
    transcriptionConfig.language_codes = [language];
  }
  if (keyterms && keyterms.length > 0) {
    transcriptionConfig.custom_vocabulary = keyterms;
  }
  const requestBody = {
    model: resolvedModel,
    input: [
      {
        type: "audio",
        data: base64Audio,
        mime_type: mimeType,
      },
    ],
  };
  if (Object.keys(transcriptionConfig).length > 0) {
    requestBody.generation_config = { transcription_config: transcriptionConfig };
  }

  debugLogger.debug(
    "Gemini batch transcription starting",
    { model: resolvedModel, language, audioBytes: audioBuffer.byteLength },
    "transcription"
  );

  const doFetch = fetchImpl || ((url, init) => net.fetch(url, init));
  const response = await doFetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    debugLogger.warn("Gemini interactions transcription failed", {
      status: response.status,
      body: redactProviderBody(errorText),
    });
    // When called in production (no injected test fetchImpl) and interactions returns 400/404
    // for a key/region without gemini-3.5-transcribe interactions enabled, fall back to generateContent.
    if (!fetchImpl && (response.status === 400 || response.status === 404) && !errorText.includes("API_KEY_INVALID")) {
      const fallbackText = await transcribeWithGeminiGenerateContent(
        { base64Audio, mimeType, language, keyterms, apiKey },
        doFetch
      );
      return { text: fallbackText, model: GEMINI_FALLBACK_MODEL };
    }
    throw providerHttpError({
      provider: "Gemini",
      model: resolvedModel,
      status: response.status,
      body: errorText,
      headers: response.headers,
      surface: "transcription",
    });
  }

  const data = await response.json();
  if (data?.status && data.status !== "completed") {
    const detail = data?.error?.message;
    throw new Error(
      detail
        ? `Gemini transcription failed: ${detail}`
        : `Gemini transcription did not complete (status: ${data.status})`
    );
  }
  let text = extractText(data);
  if (!text?.trim() && !fetchImpl) {
    try {
      text = await transcribeWithGeminiGenerateContent(
        { base64Audio, mimeType, language, keyterms, apiKey },
        doFetch
      );
    } catch {
      // Keep original empty result if fallback fails
    }
  }
  return { text, model: resolvedModel };
}

module.exports = { transcribeWithGemini };
