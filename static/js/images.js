import { canAddUpload, downloadBlob, escapeHTML, setLoading, showToast } from './shared.js';

export function initImagesToPdf() {
    const imageUploadArea = document.getElementById('image-upload-area');
    const imageFileInput = document.getElementById('image-file-input');
    const imageFileList = document.getElementById('image-file-list');
    const imageActionBar = document.getElementById('image-action-bar');
    const imageBtn = document.getElementById('image-btn');
    const imageError = document.getElementById('image-error');
    let imageFiles = [];

    imageUploadArea.addEventListener('click', () => imageFileInput.click());

    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.classList.add('drag-over');
    });

    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.classList.remove('drag-over');
    });

    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.classList.remove('drag-over');
        handleImageFiles(e.dataTransfer.files);
    });

    imageFileInput.addEventListener('change', (e) => {
        handleImageFiles(e.target.files);
        imageFileInput.value = '';
    });

    function handleImageFiles(newFiles) {
        imageError.textContent = '';
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
            if (canAddUpload(imageFiles, file)) {
                imageFiles.push(file);
            }
        }
        renderImageList();
    }

    function renderImageList() {
        imageFileList.innerHTML = '';
        if (imageFiles.length > 0) {
            imageActionBar.classList.remove('hidden');
            imageFiles.forEach((file, index) => {
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
                    <button class="remove-btn" onclick="removeImageFile(${index})" title="Hapus file">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
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
                    const draggingItem = imageFileList.querySelector('.dragging');
                    if (draggingItem && draggingItem !== li) {
                        const allItems = [...imageFileList.querySelectorAll('.file-item:not(.dragging)')];
                        const nextItem = allItems.find(item => {
                            return e.clientY <= item.getBoundingClientRect().top + item.offsetHeight / 2;
                        });
                        imageFileList.insertBefore(draggingItem, nextItem);
                    }
                });
                li.addEventListener('drop', (e) => {
                    e.preventDefault();
                    updateImageFileOrder();
                });

                imageFileList.appendChild(li);
            });
        } else {
            imageActionBar.classList.add('hidden');
        }
    }

    function updateImageFileOrder() {
        const items = imageFileList.querySelectorAll('.file-item');
        const newOrder = [];
        items.forEach(item => {
            const index = item.dataset.index;
            newOrder.push(imageFiles[index]);
        });
        imageFiles = newOrder;
        renderImageList();
    }

    window.removeImageFile = (index) => {
        imageFiles.splice(index, 1);
        renderImageList();
    };

    imageBtn.addEventListener('click', async () => {
        if (imageFiles.length === 0) return;
        setLoading(imageBtn, true);
        imageError.textContent = '';

        const formData = new FormData();
        imageFiles.forEach(file => {
            formData.append('files', file);
        });
        const fileOrder = imageFiles.map(file => file.name);
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
            let customName = document.getElementById('image-filename-input').value.trim();
            if (!customName) {
                customName = "gambar_dokumen.pdf";
            } else if (!customName.endsWith('.pdf')) {
                customName += '.pdf';
            }

            downloadBlob(blob, customName);
            showToast('PDF berhasil dibuat!');
            imageFiles = [];
            renderImageList();
        } catch (error) {
            imageError.textContent = error.message;
        } finally {
            setLoading(imageBtn, false);
        }
    });
}
