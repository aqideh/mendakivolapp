function removeEventsFromApp() {
  if (Array.isArray(window.pageNames)) {
    const eventIndex = window.pageNames.indexOf('events');
    if (eventIndex >= 0) window.pageNames.splice(eventIndex, 1);
  }

  window.renderHomeEvents = function renderHomeEvents() {};
  window.renderAllEvents = function renderAllEvents() {};
  window.sortedEvents = function sortedEvents() { return []; };
  window.upcomingEvents = function upcomingEvents() { return []; };
}

removeEventsFromApp();
document.addEventListener('DOMContentLoaded', removeEventsFromApp);
