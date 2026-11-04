  // Die Bedienoberfläche liegt in einem gleich-originigen, leeren iframe.
  // Tastaturereignisse bleiben im iframe und erreichen keine bereits registrierten
  // Nextcloud-Handler auf dem übergeordneten document/window (auch Capture-Handler).
  const host = document.createElement('iframe');
  host.id = HOST_ID;
  host.title = 'Kalenderprofile';
  host.setAttribute('aria-label',host.title);
  host.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;z-index:2147483645;';
  document.body.appendChild(host);
  const appDoc = host.contentDocument;
  if (!appDoc || !appDoc.body) { host.remove(); alert('Kalenderprofile: Isoliertes Fenster konnte nicht gestartet werden.'); return; }
  // Nextcloud-Farbvariablen sind im iframe nicht automatisch vererbbar.
  const upstream = getComputedStyle(document.documentElement);
  for (const name of ['--color-main-background','--color-main-text','--color-border','--color-border-dark','--color-primary-element','--color-primary-element-text','--color-text-maxcontrast','--color-background-hover','--color-background-dark','--border-radius-element','--border-radius-large']) {
    const value=upstream.getPropertyValue(name).trim();
    if(value)appDoc.documentElement.style.setProperty(name,value);
  }
  appDoc.documentElement.style.cssText += ';color-scheme:light;';
  appDoc.body.style.margin='0';
  const mount = appDoc.createElement('div');
  mount.id='kalenderprofile-app';
  appDoc.body.appendChild(mount);
  const shadow = mount.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = /* @STYLE_INLINE@ */;
  shadow.appendChild(style);
  const shade = document.createElement('div'); shade.className = 'shade'; shadow.appendChild(shade);
  const panel = document.createElement('section'); panel.className = 'panel';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Kalenderprofile'); shadow.appendChild(panel);
  panel.innerHTML = /* @HTML_INLINE@ */;
