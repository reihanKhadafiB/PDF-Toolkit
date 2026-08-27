document.addEventListener('DOMContentLoaded', () => {
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
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
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
                showToast(`File ${file.name} melebihi 5MB.`);
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
                    <span class="file-name" title="${file.name}">${file.name}</span>
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
            showToast(`File ${file.name} melebihi 5MB.`);
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
                    <span class="file-name" title="${convertFile.name}">${convertFile.name}</span>
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
                if(finalName.toLowerCase().endsWith('.pdf')) {
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
                    <span class="file-name" title="${compressFile.name}">${compressFile.name}</span>
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
                if(!finalName.toLowerCase().startsWith('compressed_')) {
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
                        <span class="file-name" title="${file.name}">${file.name}</span>
                    </div>
                    <button class="remove-btn" onclick="removeScanFile(${index})" title="Hapus file">
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