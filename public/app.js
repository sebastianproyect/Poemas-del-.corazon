// Detección automática de entorno - Usar ruta relativa para mayor compatibilidad
const API_URL = '/api';

// Estado de la aplicación
let currentPoemId = null;
let isAdmin = false;

// Elementos del DOM
const views = {
    home: document.getElementById('homeView'),
    detail: document.getElementById('poemDetailView'),
    admin: document.getElementById('adminLoginView'),
    create: document.getElementById('createPoemView'),
    welcome: document.getElementById('welcomeView')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    loadPoems();
});

// Navegación
function hideAllViews() {
    Object.values(views).forEach(view => view.classList.add('hidden'));
}

function showHome() {
    hideAllViews();
    views.home.classList.remove('hidden');
    loadPoems();
    currentPoemId = null;
}

function showAdminLogin() {
    if (isAdmin) {
        showCreatePoem();
    } else {
        hideAllViews();
        views.admin.classList.remove('hidden');
    }
}

function showCreatePoem() {
    hideAllViews();
    views.create.classList.remove('hidden');
}

function showPoemDetail(id) {
    currentPoemId = id;
    hideAllViews();
    views.detail.classList.remove('hidden');
    loadPoemDetail(id);
}

// Lógica de Admin
function checkAdminStatus() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        isAdmin = true;
        document.getElementById('adminBtn').textContent = 'Crear';
        document.getElementById('logoutBtn').style.display = 'inline-block';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.success) {
            isAdmin = true;
            localStorage.setItem('adminToken', password);
            checkAdminStatus();
            // Mostrar mensaje de bienvenida para Alyson
            showWelcome();
            document.getElementById('adminPassword').value = '';
            errorMsg.textContent = '';
        } else {
            errorMsg.textContent = 'Clave incorrecta';
        }
    } catch (err) {
        errorMsg.textContent = 'Error de conexión';
    }
}

function showWelcome() {
    hideAllViews();
    const welcomeView = document.getElementById('welcomeView');
    if (welcomeView) {
        welcomeView.classList.remove('hidden');
    } else {
        showCreatePoem();
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    isAdmin = false;
    document.getElementById('adminBtn').textContent = 'Autor';
    document.getElementById('logoutBtn').style.display = 'none';
    showHome();
}

// Cargar Poemas
async function loadPoems() {
    const container = document.getElementById('poemsList');
    container.innerHTML = '<div class="loading">✨ Cargando colección...</div>';

    try {
        const res = await fetch(`${API_URL}/poems`);
        const result = await res.json();

        if (result.data.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; color: #8892b0;">La colección está vacía. ¡Crea tu primera obra!</p>';
            return;
        }

        container.innerHTML = result.data.map(poem => `
            <div class="poem-card" onclick="showPoemDetail(${poem.id})">
                <h2>${poem.title}</h2>
                <div class="poem-preview">${poem.content}</div>
                <div class="poem-date">${new Date(poem.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="error">Error al cargar la colección.</p>';
    }
}

// Cargar Detalle
async function loadPoemDetail(id) {
    const article = document.getElementById('singlePoem');
    const commentsList = document.getElementById('commentsList');
    const adminControls = document.getElementById('adminControls');
    const commentForm = document.getElementById('commentForm');
    const commentMsg = document.getElementById('commentRestrictionMsg');
    const editForm = document.getElementById('editPoemForm');

    // Resetear vistas
    article.classList.remove('hidden');
    if (editForm) editForm.classList.add('hidden');

    // Mostrar controles admin
    if (isAdmin && adminControls) {
        adminControls.classList.remove('hidden');
    } else if (adminControls) {
        adminControls.classList.add('hidden');
    }

    // Restricción de comentarios
    const hasCommented = localStorage.getItem(`commented_${id}`);
    if (hasCommented) {
        if (commentForm) commentForm.classList.add('hidden');
        if (commentMsg) commentMsg.classList.remove('hidden');
    } else {
        if (commentForm) commentForm.classList.remove('hidden');
        if (commentMsg) commentMsg.classList.add('hidden');
    }

    article.innerHTML = '<div class="loading">✨ Cargando...</div>';
    commentsList.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/poems/${id}`);
        const result = await res.json();

        if (result.error) {
            article.innerHTML = 'Obra no encontrada.';
            return;
        }

        const { title, content, created_at, comments } = result.data;

        article.innerHTML = `
            <h1 id="viewTitle">${title}</h1>
            <div id="viewContent" class="content">${content}</div>
        `;

        // Guardar para edición
        article.dataset.title = title;
        article.dataset.content = content;

        renderComments(comments);

    } catch (err) {
        article.innerHTML = 'Error al cargar la obra.';
    }
}

// Habilitar Edición
function enableEditMode() {
    const article = document.getElementById('singlePoem');
    const editForm = document.getElementById('editPoemForm');
    const titleInput = document.getElementById('editPoemTitle');
    const contentInput = document.getElementById('editPoemContent');

    if (titleInput && contentInput) {
        // Usar innerHTML para contenteditable
        titleInput.innerHTML = article.dataset.title || '';
        contentInput.innerHTML = article.dataset.content || '';
    }

    article.classList.add('hidden');
    if (editForm) editForm.classList.remove('hidden');
}

function cancelEdit() {
    document.getElementById('singlePoem').classList.remove('hidden');
    document.getElementById('editPoemForm').classList.add('hidden');
}

async function savePoemChanges() {
    if (!currentPoemId || !isAdmin) return;

    // Usar innerHTML para contenteditable
    const title = document.getElementById('editPoemTitle').innerHTML;
    const content = document.getElementById('editPoemContent').innerHTML;
    const password = localStorage.getItem('adminToken');

    try {
        const res = await fetch(`${API_URL}/poems/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentPoemId, title, content, password })
        });

        if (res.ok) {
            loadPoemDetail(currentPoemId);
        } else {
            alert('Error al guardar cambios.');
        }
    } catch (err) {
        alert('Error de conexión.');
    }
}

// Borrar Poema
async function deleteCurrentPoem() {
    if (!currentPoemId || !isAdmin) return;

    if (!confirm('¿Eliminar esta obra permanentemente?')) return;

    const password = localStorage.getItem('adminToken');

    try {
        const res = await fetch(`${API_URL}/poems/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentPoemId, password })
        });

        if (res.ok) {
            showHome();
        } else {
            alert('Error al eliminar.');
        }
    } catch (err) {
        alert('Error de conexión.');
    }
}

// Borrar Comentario
async function deleteComment(id) {
    if (!isAdmin) return;
    if (!confirm('¿Eliminar este comentario?')) return;

    const password = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/comments/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password })
        });

        if (res.ok) {
            loadPoemDetail(currentPoemId);
        } else {
            alert('No se pudo borrar.');
        }
    } catch (err) {
        console.error(err);
    }
}

// Renderizar Comentarios
function renderComments(comments) {
    const list = document.getElementById('commentsList');
    if (comments.length === 0) {
        list.innerHTML = '<p class="no-comments">Sé el primero en dejar una nota. ✨</p>';
        return;
    }
    list.innerHTML = comments.map(c => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${c.author}</span>
                ${isAdmin ? `<button class="delete-comment-btn" onclick="deleteComment(${c.id})" title="Eliminar">×</button>` : ''}
            </div>
            <div class="comment-content">${c.content}</div>
        </div>
    `).join('');
}

// Enviar Comentario
async function submitComment(e) {
    e.preventDefault();
    if (!currentPoemId) return;

    const author = document.getElementById('commentAuthor').value;
    const email = document.getElementById('commentEmail').value;
    const content = document.getElementById('commentContent').value;

    try {
        const res = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poem_id: currentPoemId, author, email, content })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem(`commented_${currentPoemId}`, 'true');
            // Ocultar formulario "suavemente" o recargar
            document.getElementById('commentForm').reset();
            loadPoemDetail(currentPoemId);
        } else {
            // Mostrar error específico (ej: "Ya has dejado una huella")
            alert(data.error || 'Error al enviar nota.');
        }
    } catch (err) {
        alert('Error de conexión.');
    }
}

// Editor functions
function execCmd(command, value = null) {
    document.execCommand(command, false, value);
}

// Subir Poema
async function submitPoem(e) {
    e.preventDefault();
    // Usar innerHTML para contenteditable title
    const title = document.getElementById('newPoemTitle').innerHTML || document.getElementById('newPoemTitle').textContent;
    const content = document.getElementById('newPoemContent').innerHTML;
    const password = localStorage.getItem('adminToken');

    if (!title.trim() || title === '<br>') {
        document.getElementById('createError').textContent = 'El título no puede estar vacío.';
        return;
    }

    if (!content.trim() || content === '<br>') {
        document.getElementById('createError').textContent = 'La obra no puede estar vacía.';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/poems`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, password })
        });

        // Verificar Content-Type
        const contentType = res.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
            data = await res.json();

            if (res.ok) {
                document.getElementById('newPoemTitle').innerHTML = '';
                document.getElementById('newPoemContent').innerHTML = '';
                showHome();
            } else {
                document.getElementById('createError').textContent = data.error || 'Error al publicar.';
            }
        } else {
            // Si el servidor devuelve HTML (ej: 500 error), capturarlo
            const text = await res.text();
            console.error("Respuesta no JSON del servidor:", text);
            document.getElementById('createError').textContent = `Error del servidor (${res.status}). Revisa la consola o intenta más tarde.`;
        }
    } catch (err) {
        console.error(err);
        document.getElementById('createError').textContent = 'Error de conexión o red.';
    }
}
