import { downloadBlob, escapeHTML, setLoading, showToast } from './shared.js';

export function initCompress() {
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
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            compressFile = null;
            renderCompressList();
            showToast(`File ${file.name} bukan PDF.`);
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            compressFile = null;
            renderCompressList();
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
}
