import { MAX_FILE_SIZE, setupDropFileInput, submitTool } from './shared.js';

export function initWordToPdf() {
    const wordFileInput = document.getElementById('wordpdf-file');
    setupDropFileInput(document.getElementById('wordpdf-upload-area'), wordFileInput);
    const wordConvertButton = document.getElementById('wordpdf-btn');
    const wordActionBar = document.getElementById('wordpdf-action-bar');
    const wordSelected = document.getElementById('wordpdf-selected');
    const wordError = document.getElementById('wordpdf-error');
    let wordFile = null;
    wordFileInput.addEventListener('change', () => {
        const file = wordFileInput.files[0] || null;
        wordFileInput.value = '';
        wordFile = file;
        wordError.textContent = '';
        wordError.classList.add('hidden');
        if (!file) {
            wordSelected.textContent = '';
            wordSelected.classList.add('hidden');
            wordActionBar.classList.add('hidden');
            return;
        }
        const extension = file.name.toLowerCase().split('.').pop();
        if (!['doc', 'docx'].includes(extension) || file.size > MAX_FILE_SIZE || file.size === 0) {
            wordError.textContent = file.size > MAX_FILE_SIZE ? 'Ukuran file maksimal 10 MB.' : 'Pilih dokumen Word .doc atau .docx yang valid.';
            wordError.classList.remove('hidden');
            wordFile = null;
            wordSelected.classList.add('hidden');
            wordActionBar.classList.add('hidden');
            return;
        }
        wordSelected.textContent = `Dokumen dipilih: ${file.name}`;
        wordSelected.classList.remove('hidden');
        wordActionBar.classList.remove('hidden');
    });
    wordConvertButton.addEventListener('click', async () => {
        if (!wordFile) { wordError.textContent = 'Pilih dokumen Word terlebih dahulu.'; wordError.classList.remove('hidden'); return; }
        const form = new FormData();
        form.append('file', wordFile);
        const originalName = wordFile.name;
        const outputName = `${originalName.replace(/\.[^.]+$/, '')}.pdf`;
        await submitTool({button:wordConvertButton,error:wordError,url:'/api/tools/office-to-pdf',form,filename:outputName});
    });
}
