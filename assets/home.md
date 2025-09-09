## **Welcome to **W3Lab** 👋** 

This is your **default home page**.  
You can fully customize it to match your workflow by adding:

- 🔗 Links  
- 📊 Widgets  
- ⚙️ Other components

💡 **Pro Tip:** Editing your home page is simple – it’s based on **Markdown** and **CSS**, so you can style content 
exactly how you want.  
For advanced users, you can even create **custom views with JavaScript** to make dynamic, interactive components.


To start editing, click the <button class="btn btn-light btn-sm fas fa-pen"></button> button at the top of the page.  


Need help? See our [guide on customizing the home page](@nav/doc/how-to/custom-home).

---

## Package Overview

Here’s a sample widget showing the distribution of package types in your local **WebPM database**:

<componentsDonutChart margin="70" width="75%">
    <section label="ESM" class="pie-chart-ts" style="fill: blue">
    	return (c) => c.versions.slice(-1)[0].kind === 'esm'
    </section>
    <section label="Pyodide" class="pie-chart-py" style="fill: darkgreen">
    	return (c) => c.versions.slice(-1)[0].kind === 'pyodide'
    </section>
    <section  label="Backend" class="pie-chart-js" style="fill: darkorange">
    	return (c) => c.versions.slice(-1)[0].kind === 'backend'
    </section>
    <section  label="WebApp" class="pie-chart-webapp" style="fill: purple">
    	return (c) => c.versions.slice(-1)[0].kind === 'webapp'
    </section> 
</componentsDonutChart>

---
