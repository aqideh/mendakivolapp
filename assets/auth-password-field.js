function installAuthPasswordField() {
  const form = document.querySelector('[data-auth-form]');
  if (!form || form.querySelector('[data-auth-password-field]')) return;

  const submit = form.querySelector('button[type="submit"]');
  const label = document.createElement('label');
  label.dataset.authPasswordField = 'true';
  label.hidden = true;
  label.append(document.createTextNode('Password'));

  const input = document.createElement('input');
  input.name = 'password';
  input.type = 'password';
  input.autocomplete = 'current-password';
  input.placeholder = 'Password';

  label.append(input);
  form.insertBefore(label, submit);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAuthPasswordField);
} else {
  installAuthPasswordField();
}
