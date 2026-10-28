import { MAX_FILE_SIZE, setupDropFileInput, submitTool } from './shared.js';

export function initOrganizePages() {
    const organizeFileInput = document.getElementById('organize-file');
    setupDropFileInput(document.getElementById('organize-upload-area'), organizeFileInput);
    const organizeSelected = document.getElementById('organize-selected');
    const organizeEditor = document.getElementById('organize-editor');
    const organizeBtn = document.getElementById('organize-btn');
    const organizeActions = document.getElementById('organize-actions');
    const organizeError = document.getElementById('organize-error');
    let organizeFile = null;
    let organizeRotations = {};

    organizeFileInput.addEventListener('change', async () => {
        organizeFile = organizeFileInput.files[0] || null;
        organizeFileInput.value = '';
        organizeEditor.replaceChildren();
        organizeEditor.classList.add('hidden');
        organizeRotations = {};
        organizeBtn.disabled = true;
        organizeActions.classList.add('hidden');
        organizeError.textContent = '';
        organizeError.classList.add('hidden');
        if (!organizeFile) {
            organizeSelected.textContent = '';
            organizeSelected.classList.add('hidden');
            return;
        }
        organizeSelected.textContent = `File dipilih: ${organizeFile.name}`;
        organizeSelected.classList.remove('hidden');
        const isPdf = organizeFile.type === 'application/pdf' || organizeFile.name.toLowerCase().endsWith('.pdf');
        if (organizeFile.size > MAX_FILE_SIZE || !isPdf) {
            organizeError.textContent = 'Pilih PDF valid dengan ukuran maksimal 10MB.';
            organizeError.classList.remove('hidden');
            organizeFile = null;
            organizeSelected.classList.add('hidden');
            return;
        }
        organizeEditor.classList.remove('hidden');
        organizeEditor.textContent = 'Memuat pratinjau halaman…';
        try {
            const pdf = await pdfjsLib.getDocument({data: await organizeFile.arrayBuffer()}).promise;
            organizeEditor.replaceChildren();
            for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
                const page = await pdf.getPage(pageNo);
                const viewport = page.getViewport({scale: 0.55});
                const card = document.createElement('div');
                card.className = 'organize-page';
                card.draggable = true;
                card.dataset.index = String(pageNo - 1);
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                card.appendChild(canvas);
                const label = document.createElement('span');
                label.className = 'page-number';
                label.textContent = `Halaman ${pageNo}`;
                card.appendChild(label);
                const controls = document.createElement('div');
                controls.className = 'organize-controls';
                const rotate = document.createElement('button');
                rotate.type = 'button'; rotate.className = 'secondary-btn'; rotate.textContent = 'Putar 90°';
                rotate.addEventListener('click', () => {
                    const idx = card.dataset.index;
                    organizeRotations[idx] = (organizeRotations[idx] || 0) + 90;
                    canvas.style.transform = `rotate(${organizeRotations[idx]}deg)`;
                });
                const remove = document.createElement('button');
                remove.type = 'button'; remove.className = 'secondary-btn danger-btn'; remove.textContent = 'Hapus';
                remove.addEventListener('click', () => {
                    card.remove();
                    organizeBtn.disabled = organizeEditor.querySelectorAll('.organize-page').length === 0;
                });
                controls.append(rotate, remove);
                card.appendChild(controls);
                card.addEventListener('dragstart', () => card.classList.add('dragging'));
                card.addEventListener('dragend', () => card.classList.remove('dragging'));
                card.addEventListener('dragover', (event) => {
                    event.preventDefault();
                    const dragging = organizeEditor.querySelector('.dragging');
                    if (!dragging || dragging === card) return;
                    const rect = card.getBoundingClientRect();
                    const beforeCard = event.clientY < rect.top + rect.height / 2 ||
                        (event.clientY < rect.bottom && event.clientX < rect.left + rect.width / 2);
                    organizeEditor.insertBefore(dragging, beforeCard ? card : card.nextSibling);
                });
                organizeEditor.appendChild(card);
                await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
            }
            organizeBtn.disabled = pdf.numPages === 0;
            organizeActions.classList.remove('hidden');
        } catch (error) {
            organizeEditor.replaceChildren();
            organizeEditor.classList.add('hidden');
            organizeError.textContent = 'PDF tidak dapat dipratinjau. Periksa apakah file rusak atau terkunci.';
            organizeError.classList.remove('hidden');
            console.error(error);
        }
    });

    organizeBtn.addEventListener('click', async () => {
        if (!organizeFile) return;
        const pageOrder = [...organizeEditor.querySelectorAll('.organize-page')].map(card => Number(card.dataset.index));
        const form = new FormData();
        form.append('file', organizeFile);
        form.append('page_order', JSON.stringify(pageOrder));
        form.append('rotations', JSON.stringify(organizeRotations));
        await submitTool({button: organizeBtn, error: organizeError, url: '/api/tools/organize', form, filename: 'organized.pdf'});
    });
}
