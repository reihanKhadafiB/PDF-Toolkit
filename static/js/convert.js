import { MAX_FILE_SIZE, downloadBlob, escapeHTML, setLoading, showToast } from './shared.js';

export function initPdfToWord() {
    let convertFile = null;

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
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            convertFile = null;
            renderConvertList();
            showToast(`File ${file.name} bukan PDF.`);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            convertFile = null;
            renderConvertList();
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
        const ocrEnabled = document.getElementById('convert-ocr').checked;
        formData.append('ocr_scanned', String(ocrEnabled));
        formData.append('ocr_language', document.getElementById('convert-ocr-language').value);
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
    const convertOcrCheckbox = document.getElementById('convert-ocr');
    const convertOcrLanguage = document.getElementById('convert-ocr-language');
    convertOcrCheckbox.addEventListener('change', () => {
        convertOcrLanguage.disabled = !convertOcrCheckbox.checked;
    });
}
