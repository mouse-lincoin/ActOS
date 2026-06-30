export const SIMPLE_FORM_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Test Page</title>
  </head>
  <body>
    <label for="email">Email</label>
    <input id="email" type="email" placeholder="Enter email" />
    <button type="button" name="search">Search</button>
    <a href="/orders">Orders</a>
    <select id="status">
      <option>Pending</option>
      <option>Done</option>
    </select>
    <input type="checkbox" aria-label="Remember me" />
  </body>
</html>`;

export const UNSTABLE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Unstable Page</title>
  </head>
  <body>
    <div id="root"></div>
    <script>
      setInterval(() => {
        const root = document.getElementById("root");
        const node = document.createElement("div");
        node.textContent = String(Date.now());
        root.appendChild(node);
      }, 10);
    </script>
  </body>
</html>`;
