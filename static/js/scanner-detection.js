/**
 * Deteksi otomatis batas dokumen menggunakan OpenCV.js (improved)
 * - Auto-Canny threshold (berbasis median piksel → adaptif terhadap pencahayaan)
 * - Blur lebih besar → menghilangkan detail dalam (foto di KTP, teks, dll)
 * - Cari KHUSUS quadrilateral (4 sisi) terbesar + convexity check
 * - Fallback ke kontur terbesar jika tidak ada quad yang ditemukan
 */
export function autoDetectDocument(scannerPreview, scannerModal, cropperInstance, isCurrent) {
    if (!window.cv || !window.openCvReady) {
        if (scannerModal.classList.contains('hidden') || !isCurrent()) return;
        cropperInstance.autoDetectAttempts = (cropperInstance.autoDetectAttempts || 0) + 1;
        if (cropperInstance.autoDetectAttempts < 20) {
            setTimeout(() => autoDetectDocument(scannerPreview, scannerModal, cropperInstance, isCurrent), 500);
        }
        return;
    }

    const cv = window.cv;
    const img = scannerPreview;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    const maxSide = 800;
    const scaleDown = Math.min(1, maxSide / Math.max(natW, natH));
    const sW = Math.round(natW * scaleDown);
    const sH = Math.round(natH * scaleDown);

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = sW;
    tmpCanvas.height = sH;
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    tmpCtx.drawImage(img, 0, 0, sW, sH);

    let src, gray, blurred, edges, contours, hierarchy;
    try {
        src = cv.imread(tmpCanvas);
        gray = new cv.Mat();
        blurred = new cv.Mat();
        edges = new cv.Mat();
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 0);

        const pixData = tmpCtx.getImageData(0, 0, sW, sH).data;
        const lums = [];
        for (let i = 0; i < pixData.length; i += 4) {
            lums.push(0.299 * pixData[i] + 0.587 * pixData[i + 1] + 0.114 * pixData[i + 2]);
        }
        lums.sort((a, b) => a - b);
        const median = lums[Math.floor(lums.length / 2)];
        const cannyLow = Math.max(10, 0.4 * median);
        const cannyHigh = Math.min(255, 1.6 * median);
        cv.Canny(blurred, edges, cannyLow, cannyHigh);

        const kernel = cv.Mat.ones(7, 7, cv.CV_8U);
        cv.dilate(edges, edges, kernel);
        kernel.delete();

        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const minArea = sW * sH * 0.05;

        let bestQuad = null;
        let bestQuadArea = 0;

        const epsilonFactors = [0.02, 0.03, 0.04, 0.06, 0.08, 0.10];

        for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            if (area < minArea) { cnt.delete(); continue; }

            const peri = cv.arcLength(cnt, true);
            let foundQuad = false;

            for (const eps of epsilonFactors) {
                const approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, eps * peri, true);

                if (approx.rows === 4 && cv.isContourConvex(approx) && area > bestQuadArea) {
                    bestQuadArea = area;
                    if (bestQuad) bestQuad.delete();
                    bestQuad = approx;
                    foundQuad = true;
                    break;
                } else {
                    approx.delete();
                }
            }
            cnt.delete();
        }

        let boundRect = null;

        if (bestQuad) {

            boundRect = cv.boundingRect(bestQuad);
            bestQuad.delete();
        } else {

            let largestArea = 0;
            let largestCnt = null;
            for (let i = 0; i < contours.size(); i++) {
                const cnt = contours.get(i);
                const area = cv.contourArea(cnt);
                if (area > largestArea) {
                    largestArea = area;
                    if (largestCnt) largestCnt.delete();
                    largestCnt = cnt;
                } else {
                    cnt.delete();
                }
            }
            if (largestCnt && largestArea > minArea) {
                boundRect = cv.boundingRect(largestCnt);
            }
            if (largestCnt) largestCnt.delete();
        }

        if (boundRect) {

            const padding = Math.round(8 / scaleDown);
            const docLeft = Math.max(0, Math.round(boundRect.x / scaleDown) - padding);
            const docTop = Math.max(0, Math.round(boundRect.y / scaleDown) - padding);
            const docRight = Math.min(natW, Math.round((boundRect.x + boundRect.width) / scaleDown) + padding);
            const docBottom = Math.min(natH, Math.round((boundRect.y + boundRect.height) / scaleDown) + padding);
            const docW = docRight - docLeft;
            const docH = docBottom - docTop;

            if (docW > natW * 0.1 && docH > natH * 0.1) {
                const canvasData = cropperInstance.getCanvasData();
                const scaleX = canvasData.width / natW;
                const scaleY = canvasData.height / natH;

                cropperInstance.setCropBoxData({
                    left: canvasData.left + docLeft * scaleX,
                    top: canvasData.top + docTop * scaleY,
                    width: docW * scaleX,
                    height: docH * scaleY,
                });
            }
        }

    } catch (e) {
        console.warn('OpenCV auto-detect failed:', e);
    } finally {
        if (src) src.delete();
        if (gray) gray.delete();
        if (blurred) blurred.delete();
        if (edges) edges.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
    }
}
