import { EditablePageFlip } from "./editablePageFlip.js";

//GLOBALS
const apiBase = window.location.origin + "/api";
const pages = [];
const stage = document.getElementById("stage");
const book = document.getElementById("book");
const editorToolbar = document.getElementById("editorToolbar");
const editButton = document.getElementById("editButton");
const saveButton = document.getElementById("saveButton");
const addButton = document.getElementById("addButton");
const editablePageFlip = new EditablePageFlip(book);

function newPage(){
  const page = document.createElement("div")
      page.className = "page";
      page.innerHTML = `<div class="inner"></div>`
  return page;
}

async function login(){
  const session = await fetch(`${apiBase}/session.php`, {
    method: "POST",
    body: {},
  })
  if(session.ok){
    init();
    return;
  }

  const password = prompt("Enter password:");
  const res = await fetch(`${apiBase}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (res.ok) {
    init();
  } else {
    login();
  }

}

async function initPages() {
  const res = await fetch(`${apiBase}/pages.php`, { method: "GET" });

  if (!res.ok) {
    let message = "GET pages failed.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }

  const pageStorage = await res.json();
  const storedPages = Array.isArray(pageStorage?.pages) ? pageStorage.pages : [];

  pages.length = 0;
  for (const page of storedPages) {
    if (typeof page?.html !== "string") continue;
    const template = document.createElement("template");
    template.innerHTML = page.html.trim();
    const element = template.content.firstElementChild;
    if (element) pages.push(element);
  }
}

async function savePages() {
  const pagesToSave = Array.from(editablePageFlip.getPages());

  const payloadPages = pagesToSave
    .map((page, index) => ({
      pageIndex: index,
      html: page instanceof HTMLElement ? page.outerHTML : "",
    }))
    .filter((page) => page.html);

  const res = await fetch(`${apiBase}/pages.php`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pages: payloadPages }),
  });

  if (!res.ok) {
    let message = "Save pages failed.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

function showToolbar(){
  editorToolbar.style.display = "inline-flex";
  editButton.style.display = "inline-flex";
  saveButton.style.display = "inline-flex";
  addButton.style.display = "inline-flex";
}

async function init() {
  showToolbar();
  await initPages();
  editablePageFlip.loadFromHTML(pages);

  editButton.addEventListener("click", () => {
    saveButton.disabled = false;
    editButton.disabled = true;
    editablePageFlip.editPage();
  });

  saveButton.addEventListener("click", () => {
    saveButton.disabled = true;
    editButton.disabled = false;
    editablePageFlip.viewPage();
    savePages();
  });

  addButton.addEventListener("click", () => {
    saveButton.disabled = false;
    editablePageFlip.appendPages([newPage(), newPage()]);
  });
}
login();