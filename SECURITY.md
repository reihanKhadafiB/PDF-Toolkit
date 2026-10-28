# Security

## Supported use

PDF Toolkit is intended to run locally. The server binds to `127.0.0.1` by default. Exposing it on a network changes its threat model and should only be done with appropriate authentication, request limits, and deployment protections.

Uploaded documents are processed on the machine running the app. Temporary files are removed after successful processing or by scheduled cleanup. Avoid using sensitive documents on a machine you do not control.

## Reporting a vulnerability

Please report security issues privately to the repository maintainer rather than posting an exploit or sensitive document publicly. Include the affected version, impact, and a minimal reproduction that does not contain personal data. The repository has not published a dedicated security contact; use the maintainer's private contact channel until one is added.
