// Data Analysis Toolkit - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Bootstrap tabs
  const tabElements = document.querySelectorAll('a[data-bs-toggle="tab"]');
  tabElements.forEach(tab => {
    tab.addEventListener('shown.bs.tab', function (event) {
      const targetId = event.target.getAttribute('href').substring(1);
      // Load data based on the active tab
      if (targetId === 'tools') {
        loadTools();
      } else if (targetId === 'insights') {
        loadInsights();
      } else if (targetId === 'activity') {
        loadActivityLogs();
      }
    });
  });

  // Initialize range input displays
  const toolPopularity = document.getElementById('tool-popularity');
  const popularityValue = document.getElementById('popularity-value');
  if (toolPopularity && popularityValue) {
    toolPopularity.addEventListener('input', function() {
      popularityValue.textContent = this.value;
    });
  }
  
  const editToolPopularity = document.getElementById('edit-tool-popularity');
  const editPopularityValue = document.getElementById('edit-popularity-value');
  if (editToolPopularity && editPopularityValue) {
    editToolPopularity.addEventListener('input', function() {
      editPopularityValue.textContent = this.value;
    });
  }

  // Add event listeners for form submissions
  const saveToolBtn = document.getElementById('save-tool-btn');
  if (saveToolBtn) {
    saveToolBtn.addEventListener('click', saveTool);
  }
  
  const updateToolBtn = document.getElementById('update-tool-btn');
  if (updateToolBtn) {
    updateToolBtn.addEventListener('click', updateTool);
  }
  
  const saveInsightBtn = document.getElementById('save-insight-btn');
  if (saveInsightBtn) {
    saveInsightBtn.addEventListener('click', saveInsight);
  }

  // Add event listeners for search and filters
  const searchTools = document.getElementById('search-tools');
  if (searchTools) {
    searchTools.addEventListener('input', debounce(function() {
      loadTools();
    }, 300));
  }
  
  const filterType = document.getElementById('filter-type');
  if (filterType) {
    filterType.addEventListener('change', function() {
      loadTools();
    });
  }
  
  const sortTools = document.getElementById('sort-tools');
  if (sortTools) {
    sortTools.addEventListener('change', function() {
      loadTools();
    });
  }
  
  const searchInsights = document.getElementById('search-insights');
  if (searchInsights) {
    searchInsights.addEventListener('input', debounce(function() {
      loadInsights();
    }, 300));
  }
  
  // Load initial data
  loadStats();
  loadTools();
});

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// API Interaction Functions
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    if (!response.ok) {
      throw new Error('Failed to load stats');
    }
    
    const stats = await response.json();
    
    // Update stats on the page
    document.getElementById('total-tools').textContent = stats.total_tools;
    document.getElementById('total-insights').textContent = stats.total_insights;
    document.getElementById('avg-popularity').textContent = stats.average_popularity;
    document.getElementById('total-categories').textContent = Object.keys(stats.tools_by_type).length;
    
  } catch (error) {
    console.error('Error loading stats:', error);
    showToast('Failed to load statistics', 'error');
  }
}

async function loadTools() {
  const toolsContainer = document.getElementById('tools-container');
  
  if (!toolsContainer) return;
  
  // Get filter values
  const searchQuery = document.getElementById('search-tools').value.trim().toLowerCase();
  const typeFilter = document.getElementById('filter-type').value;
  const sortOrder = document.getElementById('sort-tools').value;
  
  try {
    toolsContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading tools...</p>
      </div>
    `;
    
    const response = await fetch('/api/tools');
    if (!response.ok) {
      throw new Error('Failed to load tools');
    }
    
    let tools = await response.json();
    
    // Apply client-side filtering
    if (searchQuery) {
      tools = tools.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery) || 
        (tool.description && tool.description.toLowerCase().includes(searchQuery))
      );
    }
    
    if (typeFilter) {
      tools = tools.filter(tool => tool.type === typeFilter);
    }
    
    // Apply sorting
    tools.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'popularity':
        default:
          return b.popularity - a.popularity;
      }
    });
    
    if (tools.length === 0) {
      toolsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-search" style="font-size: 3rem; color: #ccc;"></i>
          <h4 class="mt-3">No tools found</h4>
          <p class="text-muted">Try adjusting your search or filters</p>
        </div>
      `;
      return;
    }
    
    // Render tools
    toolsContainer.innerHTML = '';
    tools.forEach((tool, index) => {
      const toolCard = document.createElement('div');
      toolCard.className = 'col-lg-4 col-md-6 mb-4 animate-card';
      toolCard.style.animationDelay = `${index * 0.05}s`;
      
      const datasets = tool.datasets || [];
      
      toolCard.innerHTML = `
        <div class="card tool-card">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title">${escapeHtml(tool.name)}</h5>
              <span class="badge popularity-badge">${tool.popularity}% Popularity</span>
            </div>
            <p class="tool-type mb-2">${escapeHtml(tool.type || 'Unknown')}</p>
            <p class="card-text">${escapeHtml(tool.description || '')}</p>
            <div class="mb-3">
              ${datasets.map(dataset => `<span class="dataset-tag">${escapeHtml(dataset)}</span>`).join('')}
            </div>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-sm btn-outline-primary action-btn" onclick="openEditToolModal(${tool.id})">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-danger action-btn" onclick="deleteTool(${tool.id})">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
      
      toolsContainer.appendChild(toolCard);
    });
    
  } catch (error) {
    console.error('Error loading tools:', error);
    toolsContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
        <h4 class="mt-3">Failed to load tools</h4>
        <p class="text-muted">Please try again later</p>
      </div>
    `;
  }
}

async function loadInsights() {
  const insightsContainer = document.getElementById('insights-container');
  
  if (!insightsContainer) return;
  
  const searchQuery = document.getElementById('search-insights').value.trim().toLowerCase();
  
  try {
    insightsContainer.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading insights...</p>
      </div>
    `;
    
    const response = await fetch('/api/insights');
    if (!response.ok) {
      throw new Error('Failed to load insights');
    }
    
    let insights = await response.json();
    
    // Apply client-side filtering
    if (searchQuery) {
      insights = insights.filter(insight => 
        insight.title.toLowerCase().includes(searchQuery) || 
        insight.description.toLowerCase().includes(searchQuery)
      );
    }
    
    if (insights.length === 0) {
      insightsContainer.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-search" style="font-size: 3rem; color: #ccc;"></i>
          <h4 class="mt-3">No insights found</h4>
          <p class="text-muted">Try adjusting your search or add a new insight</p>
        </div>
      `;
      return;
    }
    
    // Render insights
    insightsContainer.innerHTML = '';
    insights.forEach((insight, index) => {
      const insightEl = document.createElement('div');
      insightEl.className = 'insight-card animate-card';
      insightEl.style.animationDelay = `${index * 0.05}s`;
      
      const tags = insight.tags || [];
      
      insightEl.innerHTML = `
        <div class="d-flex justify-content-between">
          <div>
            <div class="insight-header">${escapeHtml(insight.title)}</div>
            <div class="insight-source">
              <i class="bi bi-database"></i> 
              ${insight.data_source ? escapeHtml(insight.data_source) : 'No source specified'}
            </div>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteInsight(${insight.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <p class="mt-2">${escapeHtml(insight.description)}</p>
        <div>
          ${tags.map(tag => `<span class="insight-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      `;
      
      insightsContainer.appendChild(insightEl);
    });
    
  } catch (error) {
    console.error('Error loading insights:', error);
    insightsContainer.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
        <h4 class="mt-3">Failed to load insights</h4>
        <p class="text-muted">Please try again later</p>
      </div>
    `;
  }
}

async function loadActivityLogs() {
  const activityContainer = document.getElementById('activity-container');
  
  if (!activityContainer) return;
  
  try {
    activityContainer.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading activity logs...</p>
      </div>
    `;
    
    const response = await fetch('/api/logs');
    if (!response.ok) {
      throw new Error('Failed to load logs');
    }
    
    const logs = await response.json();
    
    if (logs.length === 0) {
      activityContainer.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-clock-history" style="font-size: 3rem; color: #ccc;"></i>
          <h4 class="mt-3">No activity yet</h4>
          <p class="text-muted">Actions will be recorded here</p>
        </div>
      `;
      return;
    }
    
    // Render activity logs
    activityContainer.innerHTML = '';
    logs.forEach(log => {
      const logEl = document.createElement('div');
      logEl.className = `log-item log-${log.action}`;
      
      const timestamp = new Date(log.timestamp).toLocaleString();
      
      // Format details for display if present
      let detailsHtml = '';
      if (log.details) {
        detailsHtml = '<ul class="mt-2 mb-0">';
        for (const [field, values] of Object.entries(log.details)) {
          detailsHtml += `<li><strong>${field}:</strong> ${escapeHtml(values.old)} → ${escapeHtml(values.new)}</li>`;
        }
        detailsHtml += '</ul>';
      }
      
      logEl.innerHTML = `
        <div class="log-timestamp">${timestamp}</div>
        <div>
          <span class="log-entity">${escapeHtml(log.entity_name)}</span> 
          was <strong>${log.action}d</strong> by ${log.user}
        </div>
        ${detailsHtml}
      `;
      
      activityContainer.appendChild(logEl);
    });
    
  } catch (error) {
    console.error('Error loading activity logs:', error);
    activityContainer.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
        <h4 class="mt-3">Failed to load activity logs</h4>
        <p class="text-muted">Please try again later</p>
      </div>
    `;
  }
}

// Form handling functions
async function saveTool() {
  const nameEl = document.getElementById('tool-name');
  const descriptionEl = document.getElementById('tool-description');
  const typeEl = document.getElementById('tool-type');
  const popularityEl = document.getElementById('tool-popularity');
  const datasetsEl = document.getElementById('tool-datasets');
  
  const name = nameEl.value.trim();
  const description = descriptionEl.value.trim();
  const type = typeEl.value;
  const popularity = parseInt(popularityEl.value);
  const datasets = datasetsEl.value ? datasetsEl.value.split(',').map(ds => ds.trim()) : [];
  
  // Basic validation
  if (!name) {
    nameEl.classList.add('is-invalid');
    return;
  }
  
  if (!type) {
    typeEl.classList.add('is-invalid');
    return;
  }
  
  // Reset validation state
  nameEl.classList.remove('is-invalid');
  typeEl.classList.remove('is-invalid');
  
  try {
    const response = await fetch('/api/tools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        type,
        popularity,
        datasets
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save tool');
    }
    
    // Close modal and refresh list
    const modal = bootstrap.Modal.getInstance(document.getElementById('addToolModal'));
    modal.hide();
    
    // Clear form
    document.getElementById('add-tool-form').reset();
    
    // Reload data
    loadStats();
    loadTools();
    
    showToast('Tool added successfully', 'success');
    
  } catch (error) {
    console.error('Error saving tool:', error);
    showToast('Failed to save tool', 'error');
  }
}

function openEditToolModal(toolId) {
  // Fetch tool data and populate form
  fetch(`/api/tools/${toolId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load tool details');
      }
      return response.json();
    })
    .then(tool => {
      document.getElementById('edit-tool-id').value = tool.id;
      document.getElementById('edit-tool-name').value = tool.name || '';
      document.getElementById('edit-tool-description').value = tool.description || '';
      document.getElementById('edit-tool-type').value = tool.type || '';
      
      const popularityInput = document.getElementById('edit-tool-popularity');
      popularityInput.value = tool.popularity || 50;
      document.getElementById('edit-popularity-value').textContent = popularityInput.value;
      
      document.getElementById('edit-tool-datasets').value = (tool.datasets || []).join(', ');
      
      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('editToolModal'));
      modal.show();
    })
    .catch(error => {
      console.error('Error loading tool details:', error);
      showToast('Failed to load tool details', 'error');
    });
}

async function updateTool() {
  const toolId = document.getElementById('edit-tool-id').value;
  const nameEl = document.getElementById('edit-tool-name');
  const descriptionEl = document.getElementById('edit-tool-description');
  const typeEl = document.getElementById('edit-tool-type');
  const popularityEl = document.getElementById('edit-tool-popularity');
  const datasetsEl = document.getElementById('edit-tool-datasets');
  
  const name = nameEl.value.trim();
  const description = descriptionEl.value.trim();
  const type = typeEl.value;
  const popularity = parseInt(popularityEl.value);
  const datasets = datasetsEl.value ? datasetsEl.value.split(',').map(ds => ds.trim()) : [];
  
  // Basic validation
  if (!name) {
    nameEl.classList.add('is-invalid');
    return;
  }
  
  if (!type) {
    typeEl.classList.add('is-invalid');
    return;
  }
  
  // Reset validation state
  nameEl.classList.remove('is-invalid');
  typeEl.classList.remove('is-invalid');
  
  try {
    const response = await fetch(`/api/tools/${toolId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        type,
        popularity,
        datasets
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update tool');
    }
    
    // Close modal and refresh list
    const modal = bootstrap.Modal.getInstance(document.getElementById('editToolModal'));
    modal.hide();
    
    // Reload data
    loadStats();
    loadTools();
    
    showToast('Tool updated successfully', 'success');
    
  } catch (error) {
    console.error('Error updating tool:', error);
    showToast('Failed to update tool', 'error');
  }
}

async function deleteTool(toolId) {
  if (!confirm('Are you sure you want to delete this tool?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/tools/${toolId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete tool');
    }
    
    // Reload data
    loadStats();
    loadTools();
    
    showToast('Tool deleted successfully', 'success');
    
  } catch (error) {
    console.error('Error deleting tool:', error);
    showToast('Failed to delete tool', 'error');
  }
}

async function saveInsight() {
  const titleEl = document.getElementById('insight-title');
  const descriptionEl = document.getElementById('insight-description');
  const sourceEl = document.getElementById('insight-source');
  const tagsEl = document.getElementById('insight-tags');
  
  const title = titleEl.value.trim();
  const description = descriptionEl.value.trim();
  const data_source = sourceEl.value.trim();
  const tags = tagsEl.value ? tagsEl.value.split(',').map(tag => tag.trim()) : [];
  
  // Basic validation
  if (!title) {
    titleEl.classList.add('is-invalid');
    return;
  }
  
  if (!description) {
    descriptionEl.classList.add('is-invalid');
    return;
  }
  
  // Reset validation state
  titleEl.classList.remove('is-invalid');
  descriptionEl.classList.remove('is-invalid');
  
  try {
    const response = await fetch('/api/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        data_source,
        tags
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save insight');
    }
    
    // Close modal and refresh list
    const modal = bootstrap.Modal.getInstance(document.getElementById('addInsightModal'));
    modal.hide();
    
    // Clear form
    document.getElementById('add-insight-form').reset();
    
    // Reload data
    loadStats();
    loadInsights();
    
    showToast('Insight added successfully', 'success');
    
  } catch (error) {
    console.error('Error saving insight:', error);
    showToast('Failed to save insight', 'error');
  }
}

async function deleteInsight(insightId) {
  if (!confirm('Are you sure you want to delete this insight?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/insights/${insightId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete insight');
    }
    
    // Reload data
    loadStats();
    loadInsights();
    
    showToast('Insight deleted successfully', 'success');
    
  } catch (error) {
    console.error('Error deleting insight:', error);
    showToast('Failed to delete insight', 'error');
  }
}

// Utility functions
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = `toast-${Date.now()}`;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.id = toastId;
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Initialize and show toast
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 5000
  });
  bsToast.show();
  
  // Remove toast from DOM after it's hidden
  toast.addEventListener('hidden.bs.toast', function() {
    toast.remove();
  });
}