import { canAddUpload, downloadBlob, escapeHTML, setLoading, showToast } from './shared.js';
import { autoDetectDocument } from './scanner-detection.js';

export function initScanner() {
    const scanUploadArea = document.getElementById('scan-upload-area');
    const scanFileInput = document.getElementById('scan-file-input');
    const scanFileList = document.getElementById('scan-file-list');
    const scanActionBar = document.getElementById('scan-action-bar');
    const scanBtn = document.getElementById('scan-btn');
    const scanError = document.getElementById('scan-error');
    let scanFiles = [];

    scanUploadArea.addEventListener('click', () => scanFileInput.click());

    scanUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        scanUploadArea.classList.add('drag-over');
    });

    scanUploadArea.addEventListener('dragleave', () => {
        scanUploadArea.classList.remove('drag-over');
    });

    scanUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        scanUploadArea.classList.remove('drag-over');
        handleScanFiles(e.dataTransfer.files);
    });

    scanFileInput.addEventListener('change', (e) => {
        handleScanFiles(e.target.files);
        scanFileInput.value = '';
    });

    function handleScanFiles(newFiles) {
        scanError.textContent = '';
        const validExtensions = ['image/jpeg', 'image/png'];
        for (let file of newFiles) {
            const imageExtension = file.name.toLowerCase().split('.').pop();
            if (!validExtensions.includes(file.type) && !['jpg', 'jpeg', 'png'].includes(imageExtension)) {
                showToast(`File ${file.name} bukan gambar (JPG/PNG).`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} melebihi 10MB.`);
                continue;
            }
            if (canAddUpload(scanFiles, file)) {
                scanFiles.push(file);
            }
        }
        renderScanList();
    }

    function renderScanList() {
        scanFileList.innerHTML = '';
        if (scanFiles.length > 0) {
            scanActionBar.classList.remove('hidden');
            scanFiles.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.draggable = true;
                li.dataset.index = index;
                li.innerHTML = `
                    <div class="drag-handle" title="Tahan dan geser untuk mengurutkan">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </div>
                    <div class="file-info">
                        <span class="file-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </span>
                        <span class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</span>
                    </div>
                    <div class="file-actions">
                        <button class="edit-btn" onclick="openScannerEditor(${index})" title="Edit Gambar Crop & Filter">
                            Edit Gambar
                        </button>
                        <button class="remove-btn" onclick="removeScanFile(${index})" title="Hapus file">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                `;

                li.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index);
                    li.classList.add('dragging');
                });
                li.addEventListener('dragend', () => {
                    li.classList.remove('dragging');
                });
                li.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const draggingItem = scanFileList.querySelector('.dragging');
                    if (draggingItem && draggingItem !== li) {
                        const allItems = [...scanFileList.querySelectorAll('.file-item:not(.dragging)')];
                        const nextItem = allItems.find(item => {
                            return e.clientY <= item.getBoundingClientRect().top + item.offsetHeight / 2;
                        });
                        scanFileList.insertBefore(draggingItem, nextItem);
                    }
                });
                li.addEventListener('drop', (e) => {
                    e.preventDefault();
                    updateScanFileOrder();
                });

                scanFileList.appendChild(li);
            });
        } else {
            scanActionBar.classList.add('hidden');
        }
    }

    function updateScanFileOrder() {
        const items = scanFileList.querySelectorAll('.file-item');
        const newOrder = [];
        items.forEach(item => {
            const index = item.dataset.index;
            newOrder.push(scanFiles[index]);
        });
        scanFiles = newOrder;
        renderScanList();
    }

    const scannerModal = document.getElementById('scanner-modal');
    const closeScannerModal = document.getElementById('close-scanner-modal');
    const cancelScanEdit = document.getElementById('cancel-scan-edit');
    const saveScanEdit = document.getElementById('save-scan-edit');
    const scannerPreview = document.getElementById('scanner-image-preview');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let cropper = null;
    let currentEditIndex = -1;
    let currentFilter = 'none';

    window.openScannerEditor = (index) => {
        currentEditIndex = index;
        const file = scanFiles[index];
        const reader = new FileReader();
        reader.onload = (e) => {
            scannerPreview.src = e.target.result;
            scannerModal.classList.remove('hidden');

            filterBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.filter-btn[data-filter="none"]').classList.add('active');
            currentFilter = 'none';
            document.querySelector('.cropper-container').style.filter = 'none';

            if (cropper) {
                cropper.destroy();
            }
            cropper = new Cropper(scannerPreview, {
                viewMode: 1,
                autoCropArea: 0.9,
                background: false,
                zoomable: true,
                responsive: true,
                ready() {

                    const cropperInstance = this.cropper;
                    autoDetectDocument(scannerPreview, scannerModal, cropperInstance, () => cropper === cropperInstance);
                }
            });
        };
        reader.readAsDataURL(file);
    };

    const closeEditor = () => {
        scannerModal.classList.add('hidden');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        scannerPreview.src = '';
    };

    closeScannerModal.addEventListener('click', closeEditor);
    cancelScanEdit.addEventListener('click', closeEditor);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;

            const filterMap = {
                'none': 'none',
                'lighten': 'brightness(1.4) contrast(2.2)',
                'magic': 'brightness(1.5) contrast(4.5) saturate(2.0)',
                'grayscale': 'grayscale(100%) brightness(1.25) contrast(2.5)',
                'bw': 'grayscale(100%) brightness(2.0) contrast(15)',
            };
            const cropperContainer = document.querySelector('.cropper-container');
            cropperContainer.style.filter = filterMap[currentFilter] || 'none';
        });
    });

    saveScanEdit.addEventListener('click', () => {
        if (!cropper) return;

        const croppedCanvas = cropper.getCroppedCanvas({
            imageSmoothingQuality: 'high'
        });
        if (!croppedCanvas) return;

        setLoading(saveScanEdit, true);

        setTimeout(() => {
            try {
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = croppedCanvas.width;
                finalCanvas.height = croppedCanvas.height;
                const ctx = finalCanvas.getContext('2d');

                const filterMap = {
                    'none': 'none',
                    'lighten': 'brightness(1.4) contrast(2.2)',
                    'magic': 'brightness(1.5) contrast(4.5) saturate(2.0)',
                    'grayscale': 'grayscale(100%) brightness(1.25) contrast(2.5)',
                    'bw': 'grayscale(100%) brightness(2.0) contrast(15)',
                };
                ctx.filter = filterMap[currentFilter] || 'none';
                ctx.drawImage(croppedCanvas, 0, 0);

                finalCanvas.toBlob(blob => {
                    const originalFile = scanFiles[currentEditIndex];
                    const editedFile = new File([blob], originalFile.name, { type: 'image/jpeg' });
                    scanFiles[currentEditIndex] = editedFile;

                    document.querySelector('.cropper-container').style.filter = 'none';
                    closeEditor();
                    renderScanList();
                    setLoading(saveScanEdit, false);
                }, 'image/jpeg', 0.95);
            } catch (e) {
                console.error(e);
                setLoading(saveScanEdit, false);
            }
        }, 50);
    });

    window.removeScanFile = (index) => {
        scanFiles.splice(index, 1);
        renderScanList();
    };

    scanBtn.addEventListener('click', async () => {
        if (scanFiles.length === 0) return;
        setLoading(scanBtn, true);
        scanError.textContent = '';

        const formData = new FormData();
        scanFiles.forEach(file => {
            formData.append('files', file);
        });
        const fileOrder = scanFiles.map(file => file.name);
        formData.append('file_order', JSON.stringify(fileOrder));

        try {
            const response = await fetch('/api/scan-to-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Gagal membuat PDF dari gambar');
            }

            const blob = await response.blob();
            let customName = document.getElementById('scan-filename-input').value.trim();
            if (!customName) {
                customName = "scanned_document.pdf";
            } else if (!customName.endsWith('.pdf')) {
                customName += '.pdf';
            }

            downloadBlob(blob, customName);
            showToast('PDF berhasil dibuat!');
            scanFiles = [];
            renderScanList();
        } catch (error) {
            scanError.textContent = error.message;
        } finally {
            setLoading(scanBtn, false);
        }
    });
}
