// Frontend JS for Airline Reservation System

// This function attaches a submit handler to a form and sends the form data to the backend API.
// It works for both GET and POST requests and displays the result in a target element.
// Parameters:
//   formId:    The ID of the form element in the HTML
//   url:       The backend API endpoint to call
//   resultId:  The ID of the element where results will be shown
//   method:    HTTP method (default is 'GET')
async function handleForm(formId, url, resultId, method = 'GET') {
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
        // For GET requests, encode data as query parameters
        const params = new URLSearchParams(data).toString();
        res = await fetch(`${url}?${params}`);
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
      } else {
        // Otherwise, just show the JSON result (for purchase, cancel, status)
        document.getElementById(resultId).textContent = JSON.stringify(json, null, 2);
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
handleForm('statusForm', '/status', 'statusResult', 'GET'); // Check flight status
