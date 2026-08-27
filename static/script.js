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