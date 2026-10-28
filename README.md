# Open Voice Flow

by Graphicarray · Numan Ahmed

Desktop dictation app. Speak, and text lands in any app. Local models (whisper.cpp, Parakeet) or your own API keys.

## Run

```bash
npm ci          # Node 24
npm run dev     # dev mode
npm run pack    # unsigned local build
```

## Brand

UI follows the Graphicarray brand rules: Abyss navy background, cyan-to-azure gradient for primary actions, Inter, 20px cards, pill buttons. Tokens live in `src/index.css`. Logo mark: `src/components/ui/BrandMark.tsx` and `src/assets/logo.svg`.

## Notes

- Cloud features (accounts, sync, sharing) still call the original service hosts. Point them at your own backend or leave Cloud mode off.
- Based on an MIT-style rebrandable license. See `LICENSE`, which must stay with copies of the source.
