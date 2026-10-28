# Third-party notices

PDF Toolkit includes or uses the components below. Their upstream copyrights and license terms remain in effect. The project license in [LICENSE](LICENSE) applies to original PDF Toolkit code, not to third-party components.

## Bundled browser assets

| Component | Bundled files | License | Notice |
| --- | --- | --- | --- |
| PDF.js, Mozilla Foundation (2023) | `static/vendors/pdfjs/pdf.min.js`, `pdf.worker.min.js` | Apache-2.0 | [License text](static/vendors/pdfjs/LICENSE); each bundle carries its upstream license header |
| OpenCV.js | `static/vendors/opencv/opencv.js` | Apache-2.0 | [OpenCV license text](static/vendors/opencv/LICENSE) |
| Cropper.js v1.6.1, Chen Fengyuan | `static/vendors/cropperjs/cropper.min.js`, `cropper.min.css` | MIT | [License text](static/vendors/cropperjs/LICENSE); upstream copyright header is retained |
| Inter font, The Inter Project Authors | `static/vendors/fonts/*.woff2` | SIL Open Font License 1.1 | [License text](static/vendors/fonts/OFL.txt) |

The repository does not record the exact OpenCV.js build version. Its license file is copied from the official OpenCV 4.x source distribution.

## Python dependency with an important license requirement

PyMuPDF is a required runtime dependency and is licensed under GNU AGPL-3.0 for open-source use, with a separate commercial license available from Artifex. PDF Toolkit is therefore licensed under AGPL-3.0. Keep the project source and license available when redistributing modified versions, and review the license terms for your intended use.

Other Python packages in `requirements.txt` are installed as separate distributions and remain under their respective upstream licenses.
