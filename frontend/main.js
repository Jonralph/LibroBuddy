// Frontend JS for Airline Reservation System

// This function attaches a submit handler to a form and sends the form data to the backend API.
// It works for both GET and POST requests and displays the result in a target element.
// Parameters:
//   formId:    The ID of the form element in the HTML
//   url:       The backend API endpoint to call
//   resultId:  The ID of the element where results will be shown
//   method:    HTTP method (default is 'GET')
// Patch: allow custom URL builder for special cases (like /status/:flightId)
async function handleForm(formId, url, resultId, method = 'GET', urlBuilder) {
  // Get the form element by its ID
  const form = document.getElementById(formId);
  // Add a submit event listener to the form
  form.addEventListener('submit', async e => {
    e.preventDefault(); // Prevent the default form submission (no page reload)
    // Convert form data to a plain object
    const data = Object.fromEntries(new FormData(form));
    let res, json;
    try {
      if (method === 'GET') {
        // For GET requests, allow custom URL builder (for /status/:flightId)
        let fetchUrl;
        if (urlBuilder) {
          fetchUrl = urlBuilder(data);
        } else {
          const params = new URLSearchParams(data).toString();
          fetchUrl = `${url}?${params}`;
        }
        res = await fetch(fetchUrl);
      } else {
        // For POST requests, send data as JSON in the request body
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      // Parse the JSON response from the backend
      json = await res.json();
      // If this is the search form, render flights as cards
      if (formId === 'searchForm' && Array.isArray(json)) {
        renderFlights(json, resultId);
      } else if (formId === 'purchaseForm') {
        renderPurchaseResult(json, resultId);
      } else if (formId === 'cancelForm') {
        renderCancelResult(json, resultId);
      } else if (formId === 'statusForm') {
        renderStatusResult(json, resultId);
      } else {
        document.getElementById(resultId).textContent = JSON.stringify(json, null, 2);
      }
    // Render a modern, friendly purchase confirmation
    function renderPurchaseResult(json, resultId) {
      const el = document.getElementById(resultId);
      if (json.success && json.reservationId) {
        el.innerHTML = `<div style="color:#1a7f37;font-weight:600;font-size:1.1em;">🎫 Your ticket has been booked!<br>Reservation ID: <span style='color:#003580;'>${json.reservationId}</span></div>`;
      } else if (json.error) {
        el.innerHTML = `<div style="color:#b91c1c;font-weight:600;">❌ ${json.error}</div>`;
      } else {
        el.textContent = JSON.stringify(json, null, 2);
      }
    }

    // Render a modern, friendly cancel confirmation
    function renderCancelResult(json, resultId) {
      const el = document.getElementById(resultId);
      if (json.success) {
        el.innerHTML = `<div style="color:#1a7f37;font-weight:600;font-size:1.1em;">🗑️ Your reservation has been cancelled.</div>`;
      } else if (json.error) {
        el.innerHTML = `<div style="color:#b91c1c;font-weight:600;">❌ ${json.error}</div>`;
      } else {
        el.textContent = JSON.stringify(json, null, 2);
      }
    }

    // Render a modern, friendly flight status card
    function renderStatusResult(json, resultId) {
      const el = document.getElementById(resultId);
      if (json.id && json.origin) {
        el.innerHTML = `
          <div class="flight-card" style="max-width:340px;margin:auto;">
            <div style="font-size:1.1em;"><strong>Flight Status</strong></div>
            <div><strong>Flight ID:</strong> ${json.id}</div>
            <div><strong>From:</strong> ${json.origin}</div>
            <div><strong>To:</strong> ${json.destination}</div>
            <div><strong>Date:</strong> ${json.date}</div>
            <div><strong>Status:</strong> <span style="color:${json.status === 'On Time' ? '#1a7f37' : '#b91c1c'};font-weight:600;">${json.status}</span></div>
          </div>
        `;
      } else if (json.error) {
        el.innerHTML = `<div style="color:#b91c1c;font-weight:600;">❌ ${json.error}</div>`;
      } else {
        el.textContent = JSON.stringify(json, null, 2);
      }
    }
    } catch (err) {
      // If there was an error (e.g., network or server), show it
      document.getElementById(resultId).textContent = 'Error: ' + err.message;
    }
  });
}

// This function displays a list of flights as styled cards in the UI.
// Parameters:
//   flights:  Array of flight objects from the backend
//   resultId: The ID of the element where cards will be shown
function renderFlights(flights, resultId) {
  const container = document.getElementById(resultId); // Get the result container
  if (!flights.length) {
    // If no flights found, show a message
    container.textContent = 'No flights found.';
    return;
  }
  // Map each flight to a card of HTML
  const cards = flights.map(flight => `
    <div class="flight-card">
      <div><strong>Flight ID:</strong> ${flight.id}</div>
      <div><strong>From:</strong> ${flight.origin}</div>
      <div><strong>To:</strong> ${flight.destination}</div>
      <div><strong>Date:</strong> ${flight.date}</div>
      <div><strong>Status:</strong> ${flight.status}</div>
    </div>
  `).join('');
  // Insert all cards into the container
  container.innerHTML = `<div class="card-list">${cards}</div>`;
}

// Attach handlers for each form on the page
// This connects the HTML forms to the backend endpoints
handleForm('searchForm', '/flights', 'searchResults', 'GET'); // Search flights
handleForm('purchaseForm', '/purchase', 'purchaseResult', 'POST'); // Purchase ticket
handleForm('cancelForm', '/cancel', 'cancelResult', 'POST'); // Cancel reservation
// For status, use /status/:flightId instead of /status?flightId=...
handleForm('statusForm', '/status', 'statusResult', 'GET', data => `/status/${encodeURIComponent(data.flightId)}`); // Check flight status
