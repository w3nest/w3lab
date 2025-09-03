# 📖 Documentation

Welcome to **W3Lab** — your dashboard for working with the local **W3Nest** server.  
Think of it as your **control center** to:

- ⚙️ Build and publish applications, libraries, or backends  
- 🌍 Explore and manage your environment and its resources  
- 🔌 Extend functionality through plugins  

<note level="hint" title="Side-by-Side View" icon="fas fa-glasses">
Keep these docs handy while you work!  
On larger screens, toggle the split view with <split-api></split-api>.  
You’ll also find the same option in the left navigation under **Doc**.
</note>

<note level="info" title="Contextual Help" icon="fas fa-book"> 
Look out for <i class="fas fa-book"></i> buttons throughout the app.  
They link directly to the relevant section of the docs, so help is always one click away.
</note>

---

## 🗂 Application Structure

**W3Lab** is organized into six main sections, visible in the left navigation panel:

---

### 1. <navNode target="Environment" id="foo"></navNode>

Your **environment at a glance**:

- What’s included  
- How it’s structured  
- What’s currently running  

🔎 Learn more:  
* <api-link target="w3nest.Configuration"></api-link> — The configuration file that defines the environment.

---

### 2. <navNode target="WebPM"></navNode>

The **local package manager** for W3Nest. Install resources on the fly:

- **ESM packages** → JavaScript modules in the browser  
- **Pyodide modules** → Python modules in the browser  
- **Backends** → Standalone HTTP servers in sandboxed environments  

🔎 Learn more:  
* <ext-link target="webpm">WebPM</ext-link> — JavaScript client for installing packages locally or remotely.  
* <api-link target="w3nest.shared_api.webpm"></api-link> — The WebPM backend.  

---

### 3. <navNode target="Projects"></navNode>

Manage your projects end-to-end:

- Build and test locally  
- Publish into the WebPM ecosystem  
- Share packages with others  

🔎 Learn more:  
* <cross-link target="doc/how-to/publish">Publish</cross-link> — Step-by-step publishing guide.  
* <api-link target="w3nest.ProjectsFinder">Projects Finder</api-link> — How projects are discovered on disk.  

---

### 4. <navNode target="Explorer"></navNode>

Browse and organize your **data and assets**:

- Grouped by visibility (with a private group just for you)  
- Upload from your PC or fetch from the online environment  
- Publish local assets online  

🔎 Learn more:  
* <cross-link target="api/http-clients-py">HTTP Client (Python)</cross-link> — Python client for asset management.  
* <github-link target="http-clients-js">HTTP Client (JavaScript)</github-link> — JavaScript client for asset management.  
* <api-link target="w3nest.shared_api.explorer"></api-link> — The explorer backend.  

---

### 5. <navNode target="Mounted"></navNode>

Easily browse files and folders from your local disk inside the **W3Lab** UI.  
When a path is referenced, use the <btn target="open-folder"></btn> button to mount and explore it.

---

### 6. <navNode target="Plugins"></navNode>

Discover and manage **plugins** to extend W3Lab with new capabilities:

- View installed plugins  
- Add your own or install community ones  

🔎 Learn more:  
* <cross-link target="w3lab/plugins">Setup Plugins</cross-link> — How to install and implement plugins.  

---

## 📚 Documentation Structure

The docs are organized into three main areas:


### <cross-link target='How-To'></cross-link>

Practical guides and recipes for common tasks.  
Perfect when you need quick, actionable help.


### <cross-link target='Server API'></cross-link>

Reference for the **W3Nest server** (Python):  
Endpoints, parameters, and server-side functionality.


### <cross-link target='W3Lab API'></cross-link>

Reference for the **W3Lab web app**:  
- Customize your Home page  
- Develop or consume plugins  
- Explore extension points  

This is also the go-to resource for anyone looking to **contribute to W3Lab**.
