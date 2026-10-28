export const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE = 50 * 1024 * 1024;
const MAX_UPLOAD_FILES = 20;

export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function canAddUpload(files, file) {
    if (files.some(existing => existing.name === file.name)) return false;
    if (files.length >= MAX_UPLOAD_FILES) {
        showToast(`Maksimal ${MAX_UPLOAD_FILES} file per proses.`);
        return false;
    }
    if (files.reduce((total, existing) => total + existing.size, file.size) > MAX_TOTAL_FILE_SIZE) {
        showToast('Total ukuran file maksimal 50MB per proses.');
        return false;
    }
    return true;
}

export function setupDropFileInput(area, input) {
    area.addEventListener('click', event => {
        if (event.target !== input) input.click();
    });
    area.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        input.click();
    });
    area.addEventListener('dragover', event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', event => {
        if (!event.relatedTarget || !area.contains(event.relatedTarget)) area.classList.remove('drag-over');
    });
    area.addEventListener('drop', event => {
        event.preventDefault();
        area.classList.remove('drag-over');
        const file = event.dataTransfer.files[0];
        if (!file) return;
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

export function initTabs() {
    const tabBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const activateTab = (btn) => {
        tabBtns.forEach(item => {
            const active = item === btn;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', String(active));
            item.tabIndex = active ? 0 : -1;
        });
        tabContents.forEach(panel => panel.classList.toggle('active', panel.id === btn.dataset.target));
    };
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn));
        btn.addEventListener('keydown', event => {
            const current = [...tabBtns].indexOf(btn);
            let next = current;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabBtns.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + tabBtns.length) % tabBtns.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabBtns.length - 1;
            else return;
            event.preventDefault();
            tabBtns[next].focus();
            activateTab(tabBtns[next]);
        });
    });
    const activeTab = document.querySelector('.nav-btn.active') || tabBtns[0];
    if (activeTab) activateTab(activeTab);
}

export function setLoading(button, isLoading) {
    const loader = button.querySelector('.loader');
    if (isLoading) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.classList.add('is-loading');
        if (loader) loader.classList.remove('hidden');
    } else {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.classList.remove('is-loading');
        if (loader) loader.classList.add('hidden');
    }
}

export function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => { window.URL.revokeObjectURL(url); anchor.remove(); }, 1000);
}

let toastTimeout;
export function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-msg');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3000);
}

export async function submitTool({ button, error, url, form, filename }) {
    error.textContent = '';
    setLoading(button, true);
    try {
        const response = await fetch(url, { method: 'POST', body: form });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || 'Dokumen tidak dapat diproses.');
        }
        downloadBlob(await response.blob(), filename);
        showToast('File berhasil diproses.');
    } catch (err) {
        error.textContent = err.message;
    } finally {
        setLoading(button, false);
    }
}
