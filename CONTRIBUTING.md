# Contributing

Thanks for helping improve PDF Toolkit.

## Project principles

- Keep document processing on the user's computer. Do not add upload-to-cloud services, accounts, analytics, or external processing APIs without an explicit project decision.
- Keep the default server bound to `127.0.0.1`.
- Make optional system dependencies clear in the interface and documentation, and return a useful error when one is missing.
- Treat PDFs and Office documents as untrusted input. Validate uploads and avoid logging document contents.
- Explain conversion limitations where output may differ from the source.

## Development

1. Create and activate a Python virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Start the app with `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
4. Make a focused change and describe which local tools or optional dependencies it needs.

When submitting a change, include a concise description, steps to reproduce or use it, and screenshots for visible interface changes when practical. Do not include real user documents, generated PDFs, credentials, or temporary files.

## Dependencies and licensing

Document any new Python or system dependency, its purpose, and any relevant licensing considerations. Keep notices for bundled assets. The project is licensed under AGPL-3.0; see [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
