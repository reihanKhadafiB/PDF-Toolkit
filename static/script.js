document.addEventListener('DOMContentLoaded', () => {
    const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
    const tabBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    let mergeFiles = [];
    let convertFile = null;
    const mergeUploadArea = document.getElementById('merge-upload-area');
    const mergeFileInput = document.getElementById('merge-file-input');
    const mergeFileList = document.getElementById('merge-file-list');
    const mergeActionBar = document.getElementById('merge-action-bar');
    const mergeBtn = document.getElementById('merge-btn');
    const mergeError = document.getElementById('merge-error');
    mergeUploadArea.addEventListener('click', () => mergeFileInput.click());
    mergeUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        mergeUploadArea.classList.add('drag-over');
    });
    mergeUploadArea.addEventListener('dragleave', () => {
        mergeUploadArea.classList.remove('drag-over');
    });
    mergeUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        mergeUploadArea.classList.remove('drag-over');
        handleMergeFiles(e.dataTransfer.files);
    });
    mergeFileInput.addEventListener('change', (e) => {
        handleMergeFiles(e.target.files);
        mergeFileInput.value = '';
    });
    function handleMergeFiles(files) {
        mergeError.textContent = '';
        for (let file of files) {
            if (file.type !== 'application/pdf') {
                showToast(`File ${file.name} bukan PDF.`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                showToast(`File ${file.name} melebihi 10MB.`);
                continue;
            }
            if (!mergeFiles.some(f => f.name === file.name)) {
                mergeFiles.push(file);
            }
        }
        renderMergeList();
    }
    function renderMergeList() {
        mergeFileList.innerHTML = '';
        if (mergeFiles.length > 0) {
            mergeActionBar.classList.remove('hidden');
        } else {
            mergeActionBar.classList.add('hidden');
        }
        mergeFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.draggable = true;
            li.dataset.index = index;
            li.innerHTML = `
                <div class="file-info">
                    <span class="drag-handle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </span>
                    <span class="file-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <span class="file-name" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</span>
                </div>
                <button class="remove-btn" onclick="removeMergeFile(${index})" title="Hapus file">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);
            mergeFileList.appendChild(li);
        });
    }
    window.removeMergeFile = (index) => {
        mergeFiles.splice(index, 1);
        renderMergeList();
    };
    let draggedItem = null;
    function handleDragStart(e) {
        draggedItem = this;
        setTimeout(() => this.classList.add('dragging'), 0);
    }
    function handleDragOver(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(mergeFileList, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            mergeFileList.appendChild(draggable);
        } else {
            mergeFileList.insertBefore(draggable, afterElement);
        }
    }
    function handleDrop(e) {
        e.preventDefault();
    }
    function handleDragEnd() {
        this.classList.remove('dragging');
        const newOrder = Array.from(mergeFileList.children).map(li => {
            const fileName = li.querySelector('.file-name').textContent;
            return mergeFiles.find(f => f.name === fileName);
        });
        mergeFiles = newOrder;
        renderMergeList();
    }
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    mergeBtn.addEventListener('click', async () => {
        if (mergeFiles.length < 2) {
            mergeError.textContent = "Butuh minimal 2 file untuk digabungkan.";
            return;
        }
        setLoading(mergeBtn, true);
        mergeError.textContent = '';
        const formData = new FormData();
        const orderList = [];
        mergeFiles.forEach(file => {
            formData.append('files', file);
            orderList.push(file.name);
        });
        formData.append('file_order', JSON.stringify(orderList));
        try {
            const response = await fetch('/api/merge', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Gagal menggabungkan PDF');
            }
            const blob = await response.blob();
            let finalName = 'merged.pdf';
            const customNameInput = document.getElementById('merge-filename-input').value.trim();
            if (customNameInput) {
                finalName = customNameInput.endsWith('.pdf') ? customNameInput : customNameInput + '.pdf';
            }
            downloadBlob(blob, finalName);
            showToast('PDF berhasil digabungkan!');
            mergeFiles = [];
            renderMergeList();
        } catch (error) {
            mergeError.textContent = error.message;
        } finally {
            setLoading(mergeBtn, false);
        }
    });
    const convertUploadArea = document.getElementById('convert-upload-area');
    const convertFileInput = document.getElementById('convert-file-input');
    const convertFileList = document.getElementById('convert-file-list');
    const convertActionBar = document.getElementById('convert-action-bar');
    const convertBtn = document.getElementById('convert-btn');
    const convertError = document.getElementById('convert-error');
    convertUploadArea.addEventListener('click', () => convertFileInput.click());
    convertUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        convertUploadArea.classList.add('drag-over');
    });
    convertUploadArea.addEventListener('dragleave', () => {
        convertUploadArea.classList.remove('drag-over');
    });
    convertUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        convertUploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleConvertFile(e.dataTransfer.files[0]);
        }
    });
    convertFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleConvertFile(e.target.files[0]);
        }
        convertFileInput.value = '';
    });
    function handleConvertFile(file) {
        convertError.textContent = '';
        if (file.type !== 'application/pdf') {
            showToast(`File ${file.name} bukan PDF.`);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showToast(`File ${file.name} melebihi 10MB.`);
            return;
        }
        convertFile = file;
        renderConvertList();
    }
    function renderConvertList() {
        convertFileList.innerHTML = '';
        if (convertFile) {
            convertActionBar.classList.remove('hidden');
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <span class="file-name" title="${escapeHTML(convertFile.name)}">${escapeHTML(convertFile.name)}</span>
                </div>
                <button class="remove-btn" onclick="removeConvertFile()" title="Hapus file">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            convertFileList.appendChild(li);
        } else {
            convertActionBar.classList.add('hidden');
        }
    }
    window.removeConvertFile = () => {
        convertFile = null;
        renderConvertList();
    };
    convertBtn.addEventListener('click', async () => {
        if (!convertFile) return;
        setLoading(convertBtn, true);
        convertError.textContent = '';
        const formData = new FormData();
        formData.append('file', convertFile);
        try {
            const response = await fetch('/api/convert/pdf-to-word', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Gagal mengonversi PDF');
            }
            const blob = await response.blob();
            let finalName = convertFile.name;
            const customNameInput = document.getElementById('convert-filename-input').value.trim();
            if (customNameInput) {
                finalName = customNameInput.endsWith('.docx') ? customNameInput : customNameInput + '.docx';
            } else {
                if (finalName.toLowerCase().endsWith('.pdf')) {
                    finalName = finalName.substring(0, finalName.length - 4) + '.docx';
                } else {
                    finalName += '.docx';
                }
            }
            downloadBlob(blob, finalName);
            showToast('PDF berhasil dikonversi ke Word!');
            removeConvertFile();
        } catch (error) {
            convertError.textContent = error.message;
        } finally {
            setLoading(convertBtn, false);
        }
    });
    const compressUploadArea = document.getElementById('compress-upload-area');
    const compressFileInput = document.getElementById('compress-file-input');
    const compressFileList = document.getElementById('compress-file-list');
    const compressActionBar = document.getElementById('compress-action-bar');
    const compressBtn = document.getElementById('compress-btn');
    const compressError = document.getElementById('compress-error');
    let compressFile = null;

    compressUploadArea.addEventListener('click', () => compressFileInput.click());

    compressUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        compressUploadArea.classList.add('drag-over');
    });

    compressUploadArea.addEventListener('dragleave', () => {
        compressUploadArea.classList.remove('drag-over');
    });

    compressUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        compressUploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleCompressFile(e.dataTransfer.files[0]);
        }
    });

    compressFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleCompressFile(e.target.files[0]);
        }
        compressFileInput.value = '';
    });

    function handleCompressFile(file) {
        compressError.textContent = '';
        if (file.type !== 'application/pdf') {
            showToast(`File ${file.name} bukan PDF.`);
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast(`File ${file.name} melebihi 10MB.`);
            return;
        }
        compressFile = file;
        renderCompressList();
    }

    function renderCompressList() {
        compressFileList.innerHTML = '';
        if (compressFile) {
            compressActionBar.classList.remove('hidden');
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <span class="file-name" title="${escapeHTML(compressFile.name)}">${escapeHTML(compressFile.name)}</span>
                </div>
                <button class="remove-btn" onclick="removeCompressFile()" title="Hapus file">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;
            compressFileList.appendChild(li);
        } else {
            compressActionBar.classList.add('hidden');
        }
    }

    window.removeCompressFile = () => {
        compressFile = null;
        renderCompressList();
    };

    compressBtn.addEventListener('click', async () => {
        if (!compressFile) return;
        setLoading(compressBtn, true);
        compressError.textContent = '';
        const formData = new FormData();
        formData.append('file', compressFile);
        try {
            const response = await fetch('/api/compress', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Gagal mengompresi PDF');
            }
            const blob = await response.blob();
            let finalName = compressFile.name;
            const customNameInput = document.getElementById('compress-filename-input').value.trim();

            if (customNameInput) {
                finalName = customNameInput.endsWith('.pdf') ? customNameInput : customNameInput + '.pdf';
            } else {
                if (!finalName.toLowerCase().startsWith('compressed_')) {
                    finalName = 'compressed_' + finalName;
                }
            }

            downloadBlob(blob, finalName);
            showToast('PDF berhasil dikompresi!');
            removeCompressFile();
        } catch (error) {
            compressError.textContent = error.message;
        } finally {
            setLoading(compressBtn, false);
        }
    });

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
            if (!validExtensions.includes(file.type)) {
                showToast(`File ${file.name} bukan gambar (JPG/PNG).`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} melebihi 10MB.`);
                continue;
            }
            if (!imageFiles.find(f => f.name === file.name)) {
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
            if (!validExtensions.includes(file.type)) {
                showToast(`File ${file.name} bukan gambar (JPG/PNG).`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} melebihi 10MB.`);
                continue;
            }
            if (!scanFiles.find(f => f.name === file.name)) {
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

                    autoDetectDocument(this.cropper);
                }
            });
        };
        reader.readAsDataURL(file);
    };

    /**
     * Deteksi otomatis batas dokumen menggunakan OpenCV.js (improved)
     * - Auto-Canny threshold (berbasis median piksel → adaptif terhadap pencahayaan)
     * - Blur lebih besar → menghilangkan detail dalam (foto di KTP, teks, dll)
     * - Cari KHUSUS quadrilateral (4 sisi) terbesar + convexity check
     * - Fallback ke kontur terbesar jika tidak ada quad yang ditemukan
     */
    function autoDetectDocument(cropperInstance) {
        if (!window.cv || !window.openCvReady) {
            setTimeout(() => autoDetectDocument(cropperInstance), 500);
            return;
        }

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

    const splitUploadArea = document.getElementById('split-upload-area');
    const splitFileInput = document.getElementById('split-file-input');
    const splitEditorContainer = document.getElementById('split-editor-container');
    const splitPagesGrid = document.getElementById('split-pages-grid');
    const splitActionBar = document.getElementById('split-action-bar');
    const splitBtn = document.getElementById('split-btn');
    const splitError = document.getElementById('split-error');
    const splitSelectedCount = document.getElementById('split-selected-count');
    const btnSelectAll = document.getElementById('split-select-all');
    const btnDeselectAll = document.getElementById('split-deselect-all');

    let currentSplitFile = null;
    let splitSelectedPages = new Set();
    let totalPdfPages = 0;

    splitUploadArea.addEventListener('click', () => splitFileInput.click());

    splitUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        splitUploadArea.classList.add('drag-over');
    });

    splitUploadArea.addEventListener('dragleave', () => {
        splitUploadArea.classList.remove('drag-over');
    });

    splitUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        splitUploadArea.classList.remove('drag-over');
        handleSplitFile(e.dataTransfer.files[0]);
    });

    splitFileInput.addEventListener('change', (e) => {
        handleSplitFile(e.target.files[0]);
    });

    async function handleSplitFile(file) {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            showToast('Harap unggah file PDF.');
            return;
        }

        currentSplitFile = file;
        splitSelectedPages.clear();
        splitError.textContent = '';
        splitUploadArea.classList.add('hidden');
        splitEditorContainer.classList.remove('hidden');
        splitActionBar.classList.remove('hidden');
        splitPagesGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Memuat halaman...</p>';
        updateSplitBtnState();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            totalPdfPages = pdf.numPages;

            splitPagesGrid.innerHTML = '';

            for (let i = 1; i <= totalPdfPages; i++) {
                const page = await pdf.getPage(i);

                const viewport = page.getViewport({ scale: 1.5 });

                const wrapper = document.createElement('div');
                wrapper.className = 'page-thumbnail-wrapper';
                wrapper.dataset.pageIndex = i - 1;

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                wrapper.appendChild(canvas);

                const checkIcon = document.createElement('div');
                checkIcon.className = 'check-icon';
                checkIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
                wrapper.appendChild(checkIcon);

                const pageNum = document.createElement('div');
                pageNum.className = 'page-number';
                pageNum.textContent = `Halaman ${i}`;
                wrapper.appendChild(pageNum);

                wrapper.addEventListener('click', () => togglePageSelection(wrapper, i - 1));

                splitPagesGrid.appendChild(wrapper);

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }
        } catch (error) {
            console.error(error);
            splitPagesGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--error);">Gagal memuat PDF.</p>';
        }
    }

    function togglePageSelection(wrapper, pageIndex) {
        if (splitSelectedPages.has(pageIndex)) {
            splitSelectedPages.delete(pageIndex);
            wrapper.classList.remove('selected');
        } else {
            splitSelectedPages.add(pageIndex);
            wrapper.classList.add('selected');
        }
        updateSplitBtnState();
    }

    function updateSplitBtnState() {
        splitSelectedCount.textContent = splitSelectedPages.size;
        splitBtn.disabled = splitSelectedPages.size === 0;
    }

    btnSelectAll.addEventListener('click', () => {
        const wrappers = splitPagesGrid.querySelectorAll('.page-thumbnail-wrapper');
        wrappers.forEach(w => {
            const idx = parseInt(w.dataset.pageIndex);
            splitSelectedPages.add(idx);
            w.classList.add('selected');
        });
        updateSplitBtnState();
    });

    btnDeselectAll.addEventListener('click', () => {
        const wrappers = splitPagesGrid.querySelectorAll('.page-thumbnail-wrapper');
        wrappers.forEach(w => {
            const idx = parseInt(w.dataset.pageIndex);
            splitSelectedPages.delete(idx);
            w.classList.remove('selected');
        });
        updateSplitBtnState();
    });

    splitBtn.addEventListener('click', async () => {
        if (!currentSplitFile || splitSelectedPages.size === 0) return;
        setLoading(splitBtn, true);
        splitError.textContent = '';

        const formData = new FormData();
        formData.append('file', currentSplitFile);

        const sortedPages = Array.from(splitSelectedPages).sort((a, b) => a - b);
        formData.append('selected_pages', JSON.stringify(sortedPages));

        try {
            const response = await fetch('/api/split', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Gagal memisahkan PDF');
            }

            const blob = await response.blob();
            let customName = document.getElementById('split-filename-input').value.trim();
            if (!customName) {
                customName = currentSplitFile.name.replace('.pdf', '') + "_split.pdf";
            } else if (!customName.endsWith('.pdf')) {
                customName += '.pdf';
            }

            downloadBlob(blob, customName);
            showToast('PDF berhasil dipisahkan!');

            splitEditorContainer.classList.add('hidden');
            splitActionBar.classList.add('hidden');
            splitUploadArea.classList.remove('hidden');
            splitFileInput.value = '';
            currentSplitFile = null;
            splitSelectedPages.clear();

        } catch (error) {
            splitError.textContent = error.message;
        } finally {
            setLoading(splitBtn, false);
        }
    });

    function setLoading(btn, isLoading) {
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.loader');
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('is-loading');
            loader.classList.remove('hidden');
        } else {
            btn.disabled = false;
            btn.classList.remove('is-loading');
            loader.classList.add('hidden');
        }
    }
    function downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    let toastTimeout;
    function showToast(message) {
        toastMsg.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
