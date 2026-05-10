# SecureVault Documentation

This folder contains the project documentation for SecureVault.

## Files
- `SecureVault_Documentation.md`: Main editable documentation source.
- `SecureVault_Documentation.docx`: Word export generated for submission.
- `build_docx.py`: Optional Python-based converter (requires `python-docx`).

## Regenerate `.docx`
### Recommended (works on macOS without extra Python packages)
```bash
/usr/bin/textutil -convert docx -output docs/SecureVault_Documentation.docx docs.doc
```

### Optional (Python)
```bash
python3 -m pip install python-docx
python3 docs/build_docx.py
```

## Notes
- Root `docs.doc` is the plain document copy requested and mirrors the Markdown content.
- Existing source code and original `docs.docx` were not modified.
