/* eslint-disable */
const bucketUploadUrl = 'http://localhost:5000/';
function getLatestPhotos(){
  return 'none yet - need to fetch';
}
// Renders the page based on the current URL
function renderApp() {
  var content;
  if (window.location.pathname === '/upload') {
    content = `<div>Welcome to the Upload page</div>
    <form method="POST" action="${bucketUploadUrl}">
      <input name="file" type="file">
      <input type="submit" value="Upload" />
    </form>`;
  } else if(window.location.pathname === '/recent'){
    content = `<div>Here's the recent photos:</div>
    <ul>
    ${getLatestPhotos()}
    </ul>`
  } else {
    content = `<div>Login</div>
    <ul>

    </ul>`
  }

  var main = document.getElementsByTagName('main')[0];
  main.innerHTML = content;
}

// Navigate to another URL and re-render the application
function navigate(evt) {
  evt.preventDefault();
  var href = evt.target.getAttribute('href');
  window.history.pushState({}, undefined, href);
  renderApp();
}

document.addEventListener('DOMContentLoaded', function(event) {
  // Attach the event listener once the DOM has been loaded
  var nav = document.getElementsByTagName('nav')[0];
  nav.addEventListener("click", navigate, false);

  // First initial App rendering
  renderApp();
});
