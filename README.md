## Cloudflare Playwright MCP

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/playwright-mcp/tree/main/cloudflare/examples/mcp)

### Overview

This project leverages Playwright for automated browser testing and integrates with Cloudflare Workers, [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) and [`@cloudflare/playwright`](https://github.com/cloudflare/playwright) for deployment.

### Build and Deploy

Follow these steps to set up and deploy the project:

1. Install dependencies:
```bash
npm ci
```

2. Build:
```bash
cd cloudflare
npm run build
```

3. Deploy to Cloudflare Workers:

```bash
cd cloudflare/examples/mcp
npx wrangler deploy
```

### Use with Cloudflare AI Playground

![alt text](docs/imgs/playground-ai-screenshot.png)

[Cloudflare playground AI](https://playground.ai.cloudflare.com/) is a great way to test MCP servers using LLM models available in Workers AI.

- Navigate to https://playground.ai.cloudflare.com/
- Ensure model is set to `llama-3.3-70b-instruct-fp8-fast`
- In **MCP Servers**, set **URL** to `https://[my-mcp-url].workers.dev/sse`
- Click **Connect**
- Status should update to **Connected** and it should list 14 available tools

You can now start to interact with the model, and it will run necessary tools to accomplish what was requested.

> [!TIP]
> For best results, give simple instructions consisting of one single action, e. g., "Create a new todo entry", "Go to cloudflare site", "Take a screenshot"


Example of a conversation:

| Role | Message |
|------|---------|
| **User** | Go to demo.playwright.dev/todomvc |
| **Assistant** | *runs browser_navigate tool*<br> The page has been navigated to https://demo.playwright.dev/todomvc/. The page title is "React • TodoMVC". The page snapshot shows the content of the page, including a heading, a textbox, and several links. |
| **User** | Create some todo entry |
| **Assistant** |  *runs browser_type tool*<br> A new todo entry "Buy groceries" has been created. The page snapshot shows the updated content of the page, including the new todo entry. |
| **User** | Nice. Now create a todo in parrot style |
| **Assistant** | *runs browser_type tool*<br> A new todo entry "Polly wants a cracker" has been created in parrot style. The page snapshot shows the updated content of the page, including the new todo entry. |
| **User** | And create another todo in yoda style |
| **Assistant** | *runs browser_type tool*<br> A new todo entry "A walk, I must take" has been created in Yoda style. The page snapshot shows the updated content of the page, including the new todo entry. |
| **User** | Take a screenshot |
| **Assistant** | *runs browser_take_screenshot tool*<br> ![alt text](docs/imgs/todomvc-screenshot-1.png) A screenshot of the current page has been taken. The screenshot is in PNG format and is 56KB in size. |
| **User** | Now click the checkbox of the parrot todo entry |
| **Assistant** | *runs browser_clickt tool*<br> The checkbox of the parrot todo entry "Polly wants a cracker" has been clicked. The page snapshot shows the updated content of the page, with the checkbox now checked. |
| **User** | Take a screenshot |
| **Assistant** | *runs browser_take_screenshot tool*<br> ![alt text](docs/imgs/todomvc-screenshot-2.png) A screenshot of the current page has been taken. The screenshot is in PNG format and is 58KB in size. |
| **User** | Remove completed todo entries |
| **Assistant** | *runs browser_clickt tool*<br> The "Clear completed" button has been clicked. The page snapshot shows the updated content of the page, with the completed todo entry "Polly wants a cracker" removed. |
| **User** | Take a final screenshot |
| **Assistant** | *runs browser_take_screenshot tool*<br> ![alt text](docs/imgs/todomvc-screenshot-3.png) A final screenshot of the current page has been taken. The screenshot is in PNG format and is 50KB in size. |

### Use with Claude Desktop

As of now, [Claude Desktop](https://claude.ai/download) only supports local MCP servers. To use `playground-mcp` with Claude Desktop we make use of [mcp-remote](https://github.com/geelen/mcp-remote), a tool that proxies remote MCP servers and exposes them locally. Use the following configuration:

1. Open the configuration file for Claude Desktop.
2. Add the following JSON snippet under the `mcpServers` section:

```json
{
  "mcpServers": {
    "cloudflare-playwright-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://[my-mcp-url].workers.dev/sse"
      ]
    }
  }
}
```

3. Save the configuration file and **restart** Claude Desktop to apply the changes.

This setup ensures that Claude Desktop can communicate with the Cloudflare Playwright MCP server.

Here's an example of a session opening the TODO demo app, adding "buy lemons" and doing a screenshot, taking advantage of playwright-mcp tools and Browser Rendering:

![alt text](docs/imgs/claudemcp.gif)

### Configure in VSCode

You can install the Playwright MCP server using the [VS Code CLI](https://code.visualstudio.com/docs/configure/command-line):

```bash
# For VS Code
code --add-mcp '{"name":"cloudflare-playwright","type":"sse","url":"https://[my-mcp-url].workers.dev/sse"}'
```

```bash
# For VS Code Insiders
code-insiders --add-mcp '{"name":"cloudflare-playwright","type":"sse","url":"https://[my-mcp-url].workers.dev/sse"}'
```

After installation, the Playwright MCP server will be available for use with your GitHub Copilot agent in VS Code.

### Tool Modes

The tools are available in two modes:

1. **Snapshot Mode** (default): Uses accessibility snapshots for better performance and reliability
2. **Vision Mode**: Uses screenshots for visual-based interactions

Vision Mode works best with the computer use models that are able to interact with elements using
X Y coordinate space, based on the provided screenshot.

<!--- Generated by update-readme.js -->

### Snapshot-based Interactions

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_snapshot**
  - Description: Capture accessibility snapshot of the current page, this is better than screenshot
  - Parameters: None

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_click**
  - Description: Perform click on a web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_drag**
  - Description: Perform drag and drop between two elements
  - Parameters:
    - `startElement` (string): Human-readable source element description used to obtain the permission to interact with the element
    - `startRef` (string): Exact source element reference from the page snapshot
    - `endElement` (string): Human-readable target element description used to obtain the permission to interact with the element
    - `endRef` (string): Exact target element reference from the page snapshot

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_hover**
  - Description: Hover over element on page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_type**
  - Description: Type text into editable element
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
    - `slowly` (boolean, optional): Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_select_option**
  - Description: Select an option in a dropdown
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `values` (array): Array of values to select in the dropdown. This can be a single value or multiple values.

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_take_screenshot**
  - Description: Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.
  - Parameters:
    - `raw` (boolean, optional): Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.
    - `element` (string, optional): Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.
    - `ref` (string, optional): Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.

### Vision-based Interactions

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_capture**
  - Description: Take a screenshot of the current page
  - Parameters: None

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_move_mouse**
  - Description: Move mouse to a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_click**
  - Description: Click left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_drag**
  - Description: Drag left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `startX` (number): Start X coordinate
    - `startY` (number): Start Y coordinate
    - `endX` (number): End X coordinate
    - `endY` (number): End Y coordinate

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_type**
  - Description: Type text
  - Parameters:
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)

### Tab Management

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_list**
  - Description: List browser tabs
  - Parameters: None

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_new**
  - Description: Open a new tab
  - Parameters:
    - `url` (string, optional): The URL to navigate to in the new tab. If not provided, the new tab will be blank.

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_select**
  - Description: Select a tab by index
  - Parameters:
    - `index` (number): The index of the tab to select

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_close**
  - Description: Close a tab
  - Parameters:
    - `index` (number, optional): The index of the tab to close. Closes current tab if not provided.

### Navigation

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate**
  - Description: Navigate to a URL
  - Parameters:
    - `url` (string): The URL to navigate to

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate_back**
  - Description: Go back to the previous page
  - Parameters: None

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate_forward**
  - Description: Go forward to the next page
  - Parameters: None

### Keyboard

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_press_key**
  - Description: Press a key on the keyboard
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`

### Console

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_console_messages**
  - Description: Returns all console messages
  - Parameters: None

### Files and Media

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_file_upload**
  - Description: Upload one or multiple files
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_pdf_save**
  - Description: Save page as PDF
  - Parameters: None

### Utilities

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_close**
  - Description: Close the page
  - Parameters: None

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_wait**
  - Description: Wait for a specified time in seconds
  - Parameters:
    - `time` (number): The time to wait in seconds

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_resize**
  - Description: Resize the browser window
  - Parameters:
    - `width` (number): Width of the browser window
    - `height` (number): Height of the browser window

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_handle_dialog**
  - Description: Handle a dialog
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.

<!--- End of generated section -->
