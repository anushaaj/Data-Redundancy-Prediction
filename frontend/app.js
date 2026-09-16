const API_URL = 'http://localhost:5000/api/data';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener('DOMContentLoaded', () => {
    fetchDatabaseEntries();

    const form = document.getElementById('ingestionForm');
    form.addEventListener('submit', handleFormSubmit);
    document.getElementById('tableSearch').addEventListener('input', handleTableSearch);
});

// Fetch verified entries from unique tracking datastore array
async function fetchDatabaseEntries() {
    try {
        showSpinner(true);
        const response = await fetch(API_URL);
        const result = await response.json();
        showSpinner(false);
        
        if (result.success) {
            renderTable(result.data);
        }
    } catch (error) {
        showSpinner(false);
        console.error('Error contacting central data hub:', error);
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email').value;
    const phoneInput = document.getElementById('phone').value;
    const logBox = document.getElementById('logMessage');

    logBox.className = 'log-message hidden';

    // Simple client-side validation to improve UX
    if (!emailRegex.test(emailInput) || !phoneInput || phoneInput.replace(/\s+/g, '').length < 7) {
        showStatus('False Positive', 'Invalid local formatting. Fix inputs before submitting.', 'danger');
        return;
    }

    const submitBtn = document.querySelector('.btn');
    submitBtn.disabled = true;
    showSpinner(true);

    try {
        const response = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput, phone: phoneInput })
        });

        const result = await response.json();
        logBox.classList.remove('hidden');
        showSpinner(false);
        submitBtn.disabled = false;

        if (response.status === 201) {
            // Status Unique and Verified
            showStatus(result.classification, result.message, 'success');
            document.getElementById('ingestionForm').reset();
            fetchDatabaseEntries(); // Refresh table view visually
        } else if (response.status === 409) {
            // Status Redundant Duplicate
            showStatus(result.classification, result.message, 'warning');
        } else {
            // Status False Positive Format Error
            showStatus(result.classification || 'False Positive', result.message || 'Validation failed.', 'danger');
        }

    } catch (error) {
        showSpinner(false);
        submitBtn.disabled = false;
        showStatus('Communication Failure', 'Cannot reach backend. Ensure server is running.', 'danger');
    }
}

// Inject entries safely into tables DOM
function renderTable(dataRecords) {
    const tableBody = document.getElementById('databaseTableBody');
    tableBody.innerHTML = '';

    if (dataRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No clean records verified inside database storage block.</td></tr>`;
        return;
    }

    dataRecords.forEach(record => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${record.id}</strong></td>
            <td>${escapeHTML(record.email)}</td>
            <td>${escapeHTML(record.phone)}</td>
            <td><code>${escapeHTML(record.identityHash)}</code></td>
        `;
        tableBody.appendChild(tr);
    });
}

// XSS mitigation handling sanitization routine natively
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Show spinner helper
function showSpinner(visible) {
    const s = document.getElementById('loadingSpinner');
    if (!s) return;
    s.classList.toggle('hidden', !visible);
}

// Unified status display with badge
function showStatus(title, message, level) {
    const logBox = document.getElementById('logMessage');
    const badge = document.getElementById('statusBadge');
    const text = document.getElementById('statusText');

    logBox.classList.remove('hidden');
    text.textContent = ` ${message}`;
    badge.textContent = title;

    badge.className = 'status-badge';
    if (level === 'success') badge.classList.add('badge-success');
    else if (level === 'warning') badge.classList.add('badge-warning');
    else badge.classList.add('badge-danger');

    // Apply outer styling for colors
    logBox.classList.remove('status-success','status-redundant','status-false');
    if (level === 'success') logBox.classList.add('status-success');
    else if (level === 'warning') logBox.classList.add('status-redundant');
    else logBox.classList.add('status-false');

    // Auto-hide after a short delay for non-critical messages
    setTimeout(() => {
        // keep success visible for a bit, hide others sooner
        if (level === 'success') return;
        logBox.classList.add('hidden');
    }, 4500);
}

// Simple client-side search filter
function handleTableSearch(e) {
    const q = e.target.value.trim().toLowerCase();
    const rows = document.querySelectorAll('#databaseTableBody tr');
    rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = q === '' || text.includes(q) ? '' : 'none';
    });
}