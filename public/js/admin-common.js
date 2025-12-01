// =============================================
// ADMIN COMMON FUNCTIONS
// Authentication, API requests, utilities
// =============================================

const API_URL = 'http://localhost:3000/api';

// =============================================
// AUTHENTICATION
// =============================================

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getUsuario() {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

function checkAdminAuth() {
  const usuario = getUsuario();
  const token = getAuthToken();

  if (!token || !usuario) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }

  // Check if user is admin (RolID === 1)
  if (usuario.rolID !== 1) {
    alert('⛔ Acceso denegado. Se requiere rol de administrador.');
    window.location.href = 'index.html';
    return false;
  }

  // Update admin name in sidebar
  const adminNameEl = document.getElementById('admin-name');
  if (adminNameEl) {
    adminNameEl.textContent = usuario.nombre || usuario.email;
  }

  // Set up logout button
  const logoutBtn = document.getElementById('btn-logout-admin');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  return true;
}

function logout() {
  if (confirm('¿Está seguro que desea cerrar sesión?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
  }
}

// =============================================
// API REQUESTS
// =============================================

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  const response = await fetch(`${API_URL}${endpoint}`, mergedOptions);

  if (response.status === 401 || response.status === 403) {
    showToast('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
    throw new Error('Unauthorized');
  }

  return response;
}

// =============================================
// UI UTILITIES
// =============================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[type]};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.2rem;
      ">${icons[type]}</div>
      <span>${message}</span>
    </div>
  `;

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid ${colors[type]};
    border-left: 4px solid ${colors[type]};
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    min-width: 300px;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showLoading(container) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
        <div class="spinner"></div>
        <p>Cargando...</p>
      </div>
    `;
  }
}

function showError(container, message = 'Error al cargar datos') {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgba(239, 68, 68, 0.8);">
        <p style="font-size: 2rem; margin-bottom: 10px;">⚠️</p>
        <p>${message}</p>
      </div>
    `;
  }
}

function showEmpty(container, message = 'No hay datos disponibles') {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
        <p style="font-size: 2rem; margin-bottom: 10px;">📋</p>
        <p>${message}</p>
      </div>
    `;
  }
}

// =============================================
// MODAL UTILITIES
// =============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function createModal(title, content, actions = []) {
  const modalId = 'modal-' + Date.now();
  
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'admin-modal';
  
  const actionsHTML = actions.map(action => `
    <button class="btn-${action.type || 'primary'}" onclick="${action.onClick}">${action.label}</button>
  `).join('');

  modal.innerHTML = `
    <div class="admin-modal-content">
      <div class="admin-modal-header">
        <h2>${title}</h2>
        <button class="btn-close" onclick="closeModal('${modalId}')">&times;</button>
      </div>
      <div class="admin-modal-body">
        ${content}
      </div>
      ${actions.length > 0 ? `<div class="form-actions">${actionsHTML}</div>` : ''}
    </div>
  `;

  document.body.appendChild(modal);
  openModal(modalId);

  return modalId;
}

// =============================================
// FORM UTILITIES
// =============================================

function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return null;

  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

function validateForm(formId, rules) {
  const form = document.getElementById(formId);
  if (!form) return false;

  let isValid = true;
  const errors = [];

  for (let field in rules) {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) continue;

    const value = input.value.trim();
    const rule = rules[field];

    if (rule.required && !value) {
      isValid = false;
      errors.push(`${rule.label || field} es requerido`);
      input.style.borderColor = 'var(--danger)';
    } else {
      input.style.borderColor = '';
    }

    if (rule.min && value.length < rule.min) {
      isValid = false;
      errors.push(`${rule.label || field} debe tener al menos ${rule.min} caracteres`);
      input.style.borderColor = 'var(--danger)';
    }

    if (rule.max && value.length > rule.max) {
      isValid = false;
      errors.push(`${rule.label || field} no debe exceder ${rule.max} caracteres`);
      input.style.borderColor = 'var(--danger)';
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      isValid = false;
      errors.push(rule.patternMessage || `${rule.label || field} no es válido`);
      input.style.borderColor = 'var(--danger)';
    }
  }

  if (!isValid) {
    showToast(errors[0], 'error');
  }

  return isValid;
}

// =============================================
// FORMATTING UTILITIES
// =============================================

function formatCurrency(amount) {
  return 'Bs ' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// =============================================
// TABLE UTILITIES
// =============================================

function createTable(columns, data, actions = []) {
  let html = '<table class="admin-table"><thead><tr>';
  
  columns.forEach(col => {
    html += `<th>${col.label}</th>`;
  });
  
  if (actions.length > 0) {
    html += '<th>Acciones</th>';
  }
  
  html += '</tr></thead><tbody>';

  if (data.length === 0) {
    html += `<tr><td colspan="${columns.length + (actions.length > 0 ? 1 : 0)}" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">No hay datos disponibles</td></tr>`;
  } else {
    data.forEach(row => {
      html += '<tr>';
      
      columns.forEach(col => {
        let value = row[col.field];
        if (col.format) {
          value = col.format(value, row);
        }
        html += `<td>${value}</td>`;
      });

      if (actions.length > 0) {
        html += '<td>';
        actions.forEach(action => {
          const onClick = action.onClick.replace('{id}', row[action.idField || 'id']);
          html += `<button class="btn-sm btn-${action.type || 'primary'}" onclick="${onClick}">${action.label}</button> `;
        });
        html += '</td>';
      }

      html += '</tr>';
    });
  }

  html += '</tbody></table>';
  return html;
}

// =============================================
// PAGINATION
// =============================================

function createPagination(currentPage, totalPages, onPageChange) {
  let html = '<div class="pagination">';
  
  if (currentPage > 1) {
    html += `<button onclick="${onPageChange}(${currentPage - 1})">← Anterior</button>`;
  }
  
  html += `<span>Página ${currentPage} de ${totalPages}</span>`;
  
  if (currentPage < totalPages) {
    html += `<button onclick="${onPageChange}(${currentPage + 1})">Siguiente →</button>`;
  }
  
  html += '</div>';
  return html;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .spinner {
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 20px;
    padding: 20px;
  }

  .pagination button {
    padding: 8px 16px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
  }

  .pagination button:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
  }

  .pagination span {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
  }
`;
document.head.appendChild(style);
