let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let selectedService = null;
let selectedProvider = null;
let selectedDate = null;
let selectedTime = null;
let editingServiceId = null;
let editingProviderId = null;
let allAdminUsers = [];
let allAdminServices = [];
let allAdminProviders = [];

// ---------- THEME ----------
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// ---------- TOASTS ----------
function showToast(text, type = 'success') {
  const toast = $(`<div class="toast toast-${type}">${text}</div>`);
  $('#toast-container').append(toast);
  setTimeout(() => toast.addClass('toast-show'), 10);
  setTimeout(() => {
    toast.removeClass('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showMessage(text, type) {
  showToast(text, type === 'error' ? 'error' : 'success');
}

// ---------- AUTH ----------
function showApp() {
  $('#login-screen').addClass('hidden');
  $('#app-screen').removeClass('hidden');
  $('#user-name').text(currentUser.name);
  $('#user-role-badge').text(currentUser.role).toggleClass('hidden', currentUser.role !== 'admin');

  const initials = currentUser.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  $('#user-avatar').text(initials);

  if (currentUser.role === 'admin') {
    $('.admin-only').removeClass('hidden');
    $('.customer-only').addClass('hidden');
    $('.tab-btn.admin-only').first().click();
  } else {
    $('.admin-only').addClass('hidden');
    $('.customer-only').removeClass('hidden');
    $('.tab-btn.customer-only').first().click();
    loadServices();
    loadMyBookings();
  }
}

function showLogin() {
  $('#app-screen').addClass('hidden');
  $('#login-screen').removeClass('hidden');
}

$('#tab-login-btn').on('click', function() {
  $(this).addClass('active'); $('#tab-signup-btn').removeClass('active');
  $('#signup-name, #signup-phone').addClass('hidden');
  $('#auth-submit').text('Login').data('mode', 'login');
});
$('#tab-signup-btn').on('click', function() {
  $(this).addClass('active'); $('#tab-login-btn').removeClass('active');
  $('#signup-name, #signup-phone').removeClass('hidden');
  $('#auth-submit').text('Sign Up').data('mode', 'signup');
});

$('#auth-submit').on('click', function() {
  const mode = $(this).data('mode') || 'login';
  const name = $('#signup-name').val();
  const phone = $('#signup-phone').val();
  const email = $('#login-email').val();
  const password = $('#login-password').val();

  if (mode === 'signup') {
    if (!phone) { showToast('Phone number is required', 'error'); return; }
    $.ajax({
      url: '/api/signup', method: 'POST', contentType: 'application/json',
      data: JSON.stringify({ name, email, password, phone }),
      success: function() {
        showToast('Signup successful! Switching to login...', 'success');
        setTimeout(() => $('#tab-login-btn').click(), 1000);
      },
      error: xhr => showToast(xhr.responseJSON?.error || 'Signup failed', 'error')
    });
  } else {
    $.ajax({
      url: '/api/login', method: 'POST', contentType: 'application/json',
      data: JSON.stringify({ email, password }),
      success: function(result) {
        currentUser = result.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        showApp();
      },
      error: xhr => showToast(xhr.responseJSON?.error || 'Login failed', 'error')
    });
  }
});

$('#btn-logout').on('click', function() {
  currentUser = null;
  localStorage.removeItem('user');
  showLogin();
});

// ---------- THEME TOGGLE ----------
$(document).ready(function() {
  $('#theme-toggle').text(savedTheme === 'dark' ? '☀️' : '🌙');
});
$(document).on('click', '#theme-toggle', function() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  $(this).text(next === 'dark' ? '☀️' : '🌙');
});

// ---------- TABS ----------
$('.tab-btn').on('click', function() {
  const target = $(this).data('target');
  $('.tab-btn').removeClass('active');
  $(this).addClass('active');
  $('.tab-panel').addClass('hidden');
  $(`#${target}`).removeClass('hidden');
  if (target === 'panel-admin-dashboard') loadAdminStats();
  if (target === 'panel-admin-users') loadAdminUsers();
  if (target === 'panel-admin-services') loadAdminServices();
  if (target === 'panel-admin-providers') loadAdminProviders();
  if (target === 'panel-admin-notifications') loadAdminNotifications();
});

// ---------- BOOKING FLOW ----------
function loadServices() {
  $.get('/api/services', function(services) {
    const container = $('#services-list').empty();
    services.forEach(service => {
      const item = $(`<div class="service-item" data-id="${service.id}"><strong>${service.name}</strong><br><small>${service.duration_minutes} min · ₹${service.price}</small></div>`);
      item.on('click', function() {
        $('.service-item').removeClass('selected');
        $(this).addClass('selected');
        selectedService = service;
        loadProviders(service.id);
        $('#next-to-provider').addClass('show');
      });
      container.append(item);
    });
  });
}

function loadProviders(serviceId) {
  $.get(`/api/providers?service_id=${serviceId}`, function(providers) {
    const container = $('#providers-list').empty();
    providers.forEach(provider => {
      const item = $(`<div class="service-item" data-id="${provider.id}"><strong>${provider.name}</strong></div>`);
      item.on('click', function() {
        $('#providers-list .service-item').removeClass('selected');
        $(this).addClass('selected');
        selectedProvider = provider;
        $('#next-to-slots').addClass('show');
      });
      container.append(item);
    });
  });
}

$('#booking-date').on('change', function() {
  selectedDate = $(this).val();
  if (!selectedProvider || !selectedDate) return;
  $.get(`/api/availability?provider_id=${selectedProvider.id}&date=${selectedDate}`, function(result) {
    const container = $('#slots-list').empty();
    result.available_slots.forEach(slot => {
      const btn = $(`<button class="slot-btn">${slot.slice(0,5)}</button>`);
      btn.on('click', function() {
      $('.slot-btn').removeClass('selected');
      $(this).addClass('selected');
      selectedTime = slot;
      $('#confirm-summary').html(`<strong>${selectedService.name}</strong> with <strong>${selectedProvider.name}</strong><br>on ${selectedDate} at ${slot.slice(0,5)}`);
      $('#confirm-phone').val(currentUser.phone || '');
      goToWizardStep(4);
    });
      container.append(btn);
    });
    if (result.available_slots.length === 0) container.append('<p>No slots available for this date.</p>');
  });
});

$('#btn-confirm').on('click', function() {
  const contact_phone = $('#confirm-phone').val();
  if (!contact_phone) { showToast('Please enter a contact phone number', 'error'); return; }

  $.ajax({
    url: '/api/book', method: 'POST', contentType: 'application/json',
    data: JSON.stringify({
      user_id: currentUser.id,
      provider_id: selectedProvider.id,
      service_id: selectedService.id,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      contact_phone
    }),
    success: function() {
      $('#success-details').html(`
        <strong>${selectedService.name}</strong> with <strong>${selectedProvider.name}</strong><br>
        ${selectedDate} at ${selectedTime.slice(0,5)}<br>
        Contact: ${contact_phone}
      `);
      $('.wizard-card').addClass('hidden');
      $('#success-card').removeClass('hidden');
      loadMyBookings();
    },
    error: xhr => showToast(xhr.responseJSON?.error || 'Booking failed', 'error')
  });
});

$('#btn-book-another').on('click', function() {
  $('#success-card').addClass('hidden');
  $('.wizard-card').removeClass('hidden');
  goToWizardStep(1);
  $('.service-item, .slot-btn').removeClass('selected');
  $('#next-to-provider, #next-to-slots').removeClass('show');
});

$('#btn-view-bookings').on('click', function() {
  $('#success-card').addClass('hidden');
  $('.wizard-card').removeClass('hidden');
  goToWizardStep(1);
  $('.service-item, .slot-btn').removeClass('selected');
  $('#next-to-provider, #next-to-slots').removeClass('show');
  $('.tab-btn[data-target="panel-bookings"]').click();
});

function loadMyBookings() {
  $.get(`/api/my-bookings?user_id=${currentUser.id}`, function(bookings) {
    const container = $('#bookings-list').empty();
    if (bookings.length === 0) { container.append('<p>No bookings yet.</p>'); return; }
    bookings.forEach(b => {
      const row = $(`
        <div class="list-row">
          <div><strong>${b.services.name}</strong> with ${b.providers.name}<br><small>${b.appointment_date} at ${b.appointment_time.slice(0,5)}</small></div>
          <div><span class="status-badge status-${b.status}">${b.status}</span>
          ${b.status === 'booked' ? `<button class="btn secondary cancel-btn" data-id="${b.id}">Cancel</button>` : ''}</div>
        </div>`);
      container.append(row);
    });
    $('.cancel-btn').on('click', function() {
      $.ajax({
        url: '/api/my-bookings', method: 'PATCH', contentType: 'application/json',
        data: JSON.stringify({ appointment_id: $(this).data('id') }),
        success: () => { showToast('Booking cancelled.', 'success'); loadMyBookings(); }
      });
    });
  });
}

// ---------- WIZARD NAVIGATION ----------
function goToWizardStep(step) {
  $('.wizard-step').removeClass('active').filter(`[data-step="${step}"]`).addClass('active');
  $('.wizard-dot').removeClass('active completed').each(function() {
    const s = parseInt($(this).data('step'));
    if (s < step) $(this).addClass('completed');
    if (s === step) $(this).addClass('active');
  });
}

$(document).on('click', '.wizard-back', function() {
  const current = parseInt($('.wizard-step.active').data('step'));
  goToWizardStep(current - 1);
});

$('#next-to-provider').on('click', function() {
  goToWizardStep(2);
});
$('#next-to-slots').on('click', function() {
  goToWizardStep(3);
});
// ---------- ADMIN: DASHBOARD ----------
function loadAdminStats() {
  $.get(`/api/admin-stats?admin_id=${currentUser.id}`, function(stats) {
    $('#stat-users').text(stats.total_users);
    $('#stat-services').text(stats.total_services);
    $('#stat-providers').text(stats.total_providers);
    $('#stat-bookings').text(stats.total_bookings);

    const container = $('#admin-recent-bookings').empty();
    if (stats.recent_bookings.length === 0) { container.append('<p>No bookings yet.</p>'); return; }
    stats.recent_bookings.forEach(b => {
      container.append(`
        <div class="list-row">
          <div><strong>${b.users.name}</strong> — ${b.services.name} with ${b.providers.name}<br>
          <small>${b.appointment_date} at ${b.appointment_time.slice(0,5)}</small></div>
          <span class="status-badge status-${b.status}">${b.status}</span>
        </div>`);
    });
  });
}

// ---------- ADMIN: USERS ----------
let usersPage = 1;

function renderAdminUsers(users) {
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  if (usersPage > totalPages) usersPage = totalPages;
  const pageItems = users.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE);

  const container = $('#admin-users-list').empty();
  if (pageItems.length === 0) { container.append('<p>No users found.</p>'); }

  pageItems.forEach(u => {
    const row = $(`
      <div class="list-row">
        <div><strong>${u.name}</strong> <span class="role-badge">${u.role}</span><br><small>${u.email}</small></div>
        ${u.id !== currentUser.id ? `<button class="btn danger del-user-btn" data-id="${u.id}">Delete</button>` : ''}
      </div>`);
    container.append(row);
  });

  renderPagination('#users-pagination', usersPage, totalPages, (p) => { usersPage = p; renderAdminUsers(allAdminUsers); });

  $('.del-user-btn').on('click', function() {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    $.ajax({
      url: '/api/admin-users', method: 'DELETE', contentType: 'application/json',
      data: JSON.stringify({ admin_id: currentUser.id, user_id: $(this).data('id') }),
      success: () => { showToast('User deleted.', 'success'); loadAdminUsers(); },
      error: xhr => showToast(xhr.responseJSON?.error || 'Delete failed', 'error')
    });
  });
}

function loadAdminUsers() {
  $.get(`/api/admin-users?admin_id=${currentUser.id}`, function(users) {
    allAdminUsers = users;
    usersPage = 1;
    renderAdminUsers(users);
  });
}

$('#search-users').on('input', function() {
  const q = $(this).val().toLowerCase();
  usersPage = 1;
  renderAdminUsers(allAdminUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
});

// ---------- ADMIN: SERVICES ----------
let servicesPage = 1;
let activeCategory = 'All';
const PAGE_SIZE = 5;

function renderAdminServices(services) {
  const categories = ['All', ...new Set(services.map(s => s.category || 'General'))];
  const filterRow = $('#category-filter-row').empty();
  categories.forEach(cat => {
    const chip = $(`<span class="category-chip ${cat === activeCategory ? 'active' : ''}">${cat}</span>`);
    chip.on('click', function() {
      activeCategory = cat;
      servicesPage = 1;
      renderAdminServices(allAdminServices);
    });
    filterRow.append(chip);
  });

  const filtered = activeCategory === 'All' ? services : services.filter(s => (s.category || 'General') === activeCategory);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (servicesPage > totalPages) servicesPage = totalPages;
  const pageItems = filtered.slice((servicesPage - 1) * PAGE_SIZE, servicesPage * PAGE_SIZE);

  const container = $('#admin-services-list').empty();
  if (pageItems.length === 0) { container.append('<p>No services found.</p>'); }

  pageItems.forEach(s => {
    const row = $(`
      <div class="list-row">
        <div><strong>${s.name}</strong><span class="category-badge">${s.category || 'General'}</span><br><small>${s.duration_minutes} min · ₹${s.price}</small></div>
        <div>
          <button class="btn secondary edit-service-btn" data-id="${s.id}" data-name="${s.name}" data-duration="${s.duration_minutes}" data-price="${s.price}" data-category="${s.category || 'General'}">Edit</button>
          <button class="btn danger del-service-btn" data-id="${s.id}">Delete</button>
        </div>
      </div>`);
    container.append(row);
  });

  renderPagination('#services-pagination', servicesPage, totalPages, (p) => { servicesPage = p; renderAdminServices(allAdminServices); });

  $('.edit-service-btn').on('click', function() {
    editingServiceId = $(this).data('id');
    $('#new-service-name').val($(this).data('name'));
    $('#new-service-duration').val($(this).data('duration'));
    $('#new-service-price').val($(this).data('price'));
    $('#new-service-category').val($(this).data('category'));
    $('#service-form-title').text('Edit Service');
    $('#btn-add-service').text('Update Service');
    $('#btn-cancel-edit-service').removeClass('hidden');
  });

  $('.del-service-btn').on('click', function() {
    if (!confirm('Delete this service?')) return;
    $.ajax({
      url: '/api/admin-services', method: 'DELETE', contentType: 'application/json',
      data: JSON.stringify({ admin_id: currentUser.id, id: $(this).data('id') }),
      success: () => { showToast('Service deleted.', 'success'); loadAdminServices(); },
      error: xhr => showToast(xhr.responseJSON?.error || 'Delete failed', 'error')
    });
  });
}

function renderPagination(containerId, currentPage, totalPages, onPageClick) {
  const container = $(containerId).empty();
  if (totalPages <= 1) return;

  const prevBtn = $(`<button ${currentPage === 1 ? 'disabled' : ''}>‹</button>`);
  prevBtn.on('click', () => onPageClick(currentPage - 1));
  container.append(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = $(`<button class="${i === currentPage ? 'active' : ''}">${i}</button>`);
    btn.on('click', () => onPageClick(i));
    container.append(btn);
  }

  const nextBtn = $(`<button ${currentPage === totalPages ? 'disabled' : ''}>›</button>`);
  nextBtn.on('click', () => onPageClick(currentPage + 1));
  container.append(nextBtn);
}

function loadAdminServices() {
  $.get('/api/admin-services', function(services) {
    allAdminServices = services;
    servicesPage = 1;
    renderAdminServices(services);
  });
}

$('#search-services').on('input', function() {
  const q = $(this).val().toLowerCase();
  servicesPage = 1;
  renderAdminServices(allAdminServices.filter(s => s.name.toLowerCase().includes(q)));
});

$('#btn-cancel-edit-service').on('click', function() {
  editingServiceId = null;
  $('#new-service-name, #new-service-duration, #new-service-price').val('');
  $('#new-service-category').val('General');
  $('#service-form-title').text('Add a Service');
  $('#btn-add-service').text('Add Service');
  $(this).addClass('hidden');
});

$('#btn-add-service').on('click', function() {
  const name = $('#new-service-name').val();
  const duration_minutes = $('#new-service-duration').val();
  const price = $('#new-service-price').val();
  const category = $('#new-service-category').val();
  if (!name || !duration_minutes || !price) { showToast('Fill all service fields', 'error'); return; }

  if (editingServiceId) {
    $.ajax({
      url: '/api/admin-services', method: 'PUT', contentType: 'application/json',
      data: JSON.stringify({ admin_id: currentUser.id, id: editingServiceId, name, duration_minutes, price, category }),
      success: function() {
        showToast('Service updated.', 'success');
        $('#btn-cancel-edit-service').click();
        loadAdminServices();
      },
      error: xhr => showToast(xhr.responseJSON?.error || 'Update failed', 'error')
    });
  } else {
    $.ajax({
      url: '/api/admin-services', method: 'POST', contentType: 'application/json',
      data: JSON.stringify({ admin_id: currentUser.id, name, duration_minutes, price, category }),
      success: function() {
        $('#new-service-name, #new-service-duration, #new-service-price').val('');
        showToast('Service added.', 'success');
        loadAdminServices();
      },
      error: xhr => showToast(xhr.responseJSON?.error || 'Add failed', 'error')
    });
  }
});

// ---------- ADMIN: PROVIDERS ----------
function renderAdminProviders(providers) {
  const totalPages = Math.max(1, Math.ceil(providers.length / PAGE_SIZE));
  if (providersPage > totalPages) providersPage = totalPages;
  const pageItems = providers.slice((providersPage - 1) * PAGE_SIZE, providersPage * PAGE_SIZE);

  const container = $('#admin-providers-list').empty();
  if (pageItems.length === 0) { container.append('<p>No providers found.</p>'); }

  pageItems.forEach(p => {
    const serviceNames = p.services.map(s => s.name).join(', ') || 'No services';
    const serviceIds = p.services.map(s => s.id).join(',');
    const row = $(`
      <div class="list-row">
        <div><strong>${p.name}</strong><br><small>${serviceNames}</small></div>
        <div>
          <button class="btn secondary edit-provider-btn" data-id="${p.id}" data-name="${p.name}" data-services="${serviceIds}">Edit</button>
          <button class="btn danger del-provider-btn" data-id="${p.id}">Delete</button>
        </div>
      </div>`);
    container.append(row);
  });

  renderPagination('#providers-pagination', providersPage, totalPages, (p) => { providersPage = p; renderAdminProviders(allAdminProviders); });

  $('.edit-provider-btn').on('click', function() {
    editingProviderId = $(this).data('id');
    $('#new-provider-name').val($(this).data('name'));
    const serviceIds = $(this).data('services').toString().split(',');
    $('#new-provider-service option').prop('selected', false);
    serviceIds.forEach(id => $(`#new-provider-service option[value="${id}"]`).prop('selected', true));
    $('#provider-form-title').text('Edit Provider');
    $('#btn-add-provider').text('Update Provider');
    $('#btn-cancel-edit-provider').removeClass('hidden');
  });

  $('.del-provider-btn').on('click', function() {
    if (!confirm('Delete this provider?')) return;
    $.ajax({
      url: '/api/admin-providers', method: 'DELETE', contentType: 'application/json',
      data: JSON.stringify({ admin_id: currentUser.id, id: $(this).data('id') }),
      success: () => { showToast('Provider deleted.', 'success'); loadAdminProviders(); },
      error: xhr => showToast(xhr.responseJSON?.error || 'Delete failed', 'error')
    });
  });
}

let providersPage = 1;

function loadAdminProviders() {
  $.get('/api/admin-providers', function(providers) {
    allAdminProviders = providers;
    providersPage = 1;
    renderAdminProviders(providers);
  });
  $.get('/api/services', function(services) {
    const select = $('#new-provider-service').empty();
    services.forEach(s => select.append(`<option value="${s.id}">${s.name}</option>`));
  });
}

$('#search-providers').on('input', function() {
  const q = $(this).val().toLowerCase();
  providersPage = 1;
  renderAdminProviders(allAdminProviders.filter(p => p.name.toLowerCase().includes(q)));
});

$('#btn-cancel-edit-provider').on('click', function() {
  editingProviderId = null;
  $('#new-provider-name').val('');
  $('#new-provider-service').val('');
  $('#provider-form-title').text('Add a Provider');
  $('#btn-add-provider').text('Add Provider');
  $(this).addClass('hidden');
});

$('#btn-add-provider').on('click', function() {
  const name = $('#new-provider-name').val();
  const service_ids = $('#new-provider-service').val();
  if (!name || !service_ids || service_ids.length === 0) { showToast('Enter a name and select at least one service', 'error'); return; }

  const payload = { admin_id: currentUser.id, name, service_ids: service_ids.map(Number) };

  if (editingProviderId) {
    payload.id = editingProviderId;
    $.ajax({
      url: '/api/admin-providers', method: 'PUT', contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function() {
        showToast('Provider updated.', 'success');
        $('#btn-cancel-edit-provider').click();
        loadAdminProviders();
      },
      error: xhr => showToast(xhr.responseJSON?.error || 'Update failed', 'error')
    });
  } else {
    $.ajax({
      url: '/api/admin-providers', method: 'POST', contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function() {
        $('#new-provider-name').val('');
        $('#new-provider-service option').prop('selected', false);
        showToast('Provider added.', 'success');
        loadAdminProviders();
      },
      error: xhr => showToast(xhr.responseJSON?.error || 'Add failed', 'error')
    });
  }
});

// ---------- ADMIN: NOTIFICATIONS ----------
function loadAdminNotifications() {
  $.get(`/api/admin-notifications?admin_id=${currentUser.id}`, function(logs) {
    const container = $('#admin-notifications-list').empty();
    if (logs.length === 0) { container.append('<p>No notifications sent yet.</p>'); return; }
    logs.forEach(log => {
      container.append(`
        <div class="list-row">
          <div><strong>${log.subject}</strong><br><small>To: ${log.recipient_email}</small><br><small>${log.message}</small></div>
          <span class="status-badge status-booked">${log.type}</span>
        </div>`);
    });
  });
}

// ---------- INIT ----------
$(document).ready(function() {
  if (currentUser) showApp(); else showLogin();
});