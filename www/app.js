import { EditablePageFlip } from "./editablePageFlip.js";

//GLOBALS
let establishedConnection = true;
const pages = [];
const stage = document.getElementById("stage");
const book = document.getElementById("book");
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

async function initPages() {
  try{
    const apiBase = "http://localhost:3001";
    const res = await fetch(`${apiBase}/api/pages`, { method: "GET" });

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
  catch (error){
    establishedConnection = false;
    if(pages.length <= 3){
    for(let i = 0; i < 4; i++){
      const page = document.createElement("div")
      switch(i){
        case 0: 
          page.className = "page frontcover"
          page.setAttribute("data-density", "hard")
          break;
        case 3:
          page.className = "page backcover";
          page.setAttribute("data-density", "hard")
          break;
        default: 
          page.className = "page";
          break;
      }
      page.innerHTML = `<div class="inner"></div>`
      pages.push(page);
    }
  }
}
}

async function savePages() {
  const apiBase = "http://localhost:3001";
  const pagesToSave = Array.from(editablePageFlip.getPages());

  const payloadPages = pagesToSave
    .map((page, index) => ({
      pageIndex: index,
      html: page instanceof HTMLElement ? page.outerHTML : "",
    }))
    .filter((page) => page.html);

  const res = await fetch(`${apiBase}/api/pages`, {
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

async function init() {
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
init().catch((err) => console.error(err));