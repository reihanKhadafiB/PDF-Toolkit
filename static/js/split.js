import { MAX_FILE_SIZE, downloadBlob, setLoading, showToast } from './shared.js';

export function initSplitPdf() {
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
    const splitChangeFile = document.getElementById('split-change-file');

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
        splitFileInput.value = '';
    });

    splitChangeFile.addEventListener('click', () => {
        currentSplitFile = null;
        splitSelectedPages.clear();
        updateSplitBtnState();
        splitPagesGrid.replaceChildren();
        splitEditorContainer.classList.add('hidden');
        splitActionBar.classList.add('hidden');
        splitUploadArea.classList.remove('hidden');
        splitError.textContent = '';
    });

    async function handleSplitFile(file) {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Harap unggah file PDF.');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showToast('Ukuran file maksimal 10 MB.');
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
            splitEditorContainer.classList.add('hidden');
            splitActionBar.classList.add('hidden');
            splitUploadArea.classList.remove('hidden');
            currentSplitFile = null;
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
}
