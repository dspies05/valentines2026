const PageFlip = (typeof window !== "undefined" && window.St)
    ? window.St.PageFlip
    : St.PageFlip;
var BookState;
(function (BookState) {
    BookState[BookState["VIEW"] = 0] = "VIEW";
    BookState[BookState["EDIT"] = 1] = "EDIT";
    BookState[BookState["UNKNOWN"] = 2] = "UNKNOWN";
})(BookState || (BookState = {}));
var PageState;
(function (PageState) {
    PageState[PageState["FRONTCOVER"] = 0] = "FRONTCOVER";
    PageState[PageState["BACKCOVER"] = 1] = "BACKCOVER";
    PageState[PageState["SPREAD"] = 2] = "SPREAD";
    PageState[PageState["UNKNOWN"] = 3] = "UNKNOWN";
})(PageState || (PageState = {}));
function images_upload_handler(blobInfo) {
    const apiBase = window.API_BASE_URL || "http://localhost:3001";
    const formData = new FormData();
    formData.append("file", blobInfo.blob(), blobInfo.filename());
    return fetch(`${apiBase}/api/images`, { method: "POST", body: formData })
        .then(async (res) => {
        if (!res.ok) {
            let message = "Upload failed.";
            try {
                const data = await res.json();
                if (data?.error)
                    message = data.error;
            }
            catch { }
            throw new Error(message);
        }
        return res.json();
    })
        .then((data) => {
        if (!data?.location) {
            throw new Error("Upload response missing location.");
        }
        return data.location;
    });
}
export class EditablePageFlip {
    constructor(book, editorConfig = {}, pageFlipConfig = {}) {
        this.pages = [];
        this.pageState = PageState.UNKNOWN;
        this.bookState = BookState.VIEW;
        this.pageFlipConfig = {
            width: 440,
            height: 520,
            size: "fixed",
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false,
        };
        this.editorConfig = {
            license_key: "gpl",
            menubar: false,
            statusbar: false,
            plugins: "image",
            toolbar: "undo redo | bold italic underline | bullist numlist | image",
            images_upload_handler: images_upload_handler
        };
        this.editors = [];
        this.book = book;
        this.bookCopy = this.book.cloneNode();
        this.bookContainer = this.book.parentElement || document.body;
        this.pageFlip = new PageFlip(this.book, this.pageFlipConfig);
        this.editorConfig = Object.assign(this.editorConfig, editorConfig);
        this.pageFlipConfig = Object.assign(this.pageFlipConfig, pageFlipConfig);
        this.addPageStateHandler();
    }
    loadFromHTML(items) {
        this.pages = Array.from(items);
        this.pageFlip.loadFromHTML(items);
    }
    createEditor(target) {
        tinymce.init({
            target: target,
            setup: (ed) => {
                this.editors.push(ed);
            },
            ...this.editorConfig
        });
    }
    destroyEditors() {
        this.editors.forEach(e => e.destroy());
        this.editors = [];
    }
    addPageStateHandler() {
        this.pageFlip.on("flip", (e) => {
            const last = this.pageFlip.getPageCount() - 1;
            if (e.data === 0) {
                this.pageState = PageState.FRONTCOVER;
            }
            else if (e.data === last) {
                this.pageState = PageState.BACKCOVER;
            }
            else {
                this.pageState = PageState.SPREAD;
            }
        });
    }
    switchToEditMode() {
        this.book.remove();
        this.bookContainer.appendChild(this.bookCopy);
        this.book = this.bookContainer.children[0];
        this.bookCopy = this.book.cloneNode();
        this.pageFlip = new PageFlip(this.book, { ...this.pageFlipConfig, disableFlipByClick: true, useMouseEvents: false });
        this.pageFlip.loadFromHTML(this.pages);
        this.addPageStateHandler();
    }
    switchToViewMode() {
        this.book.remove();
        this.bookContainer.appendChild(this.bookCopy);
        this.book = this.bookContainer.children[0];
        this.bookCopy = this.book.cloneNode();
        this.pageFlip = new PageFlip(this.book, this.pageFlipConfig);
        this.pageFlip.loadFromHTML(this.pages);
        this.addPageStateHandler();
    }
    turnToPage(index) {
        this.pageFlip.turnToPage(index);
    }
    editPage() {
        if (this.bookState === BookState.EDIT)
            return;
        let index = this.pageFlip.getCurrentPageIndex();
        this.switchToEditMode();
        this.turnToPage(index);
        if (this.pageState === PageState.SPREAD) {
            let leftPage = this.pageFlip.getPage(index);
            let leftPageContent = leftPage.getElement().children[0];
            let rightPage = this.pageFlip.getPage(index + 1);
            let rightPageContent = rightPage.getElement().children[0];
            this.createEditor(leftPageContent);
            this.createEditor(rightPageContent);
        }
        else {
            let cover = this.pageFlip.getPage(index);
            let coverContent = cover.getElement().children[0];
            this.createEditor(coverContent);
        }
        this.bookState = BookState.EDIT;
    }
    viewPage() {
        if (this.bookState === BookState.VIEW)
            return;
        let index = this.pageFlip.getCurrentPageIndex();
        this.switchToViewMode();
        this.turnToPage(index);
        this.destroyEditors();
        this.bookState = BookState.VIEW;
    }
    getBookState() {
        return this.bookState;
    }
    getPageState() {
        return this.pageState;
    }
    getPages() {
        return this.pages;
    }
    appendPages(pages) {
        let pagesToAdd = Array.from(pages);
        let head = this.pages.splice(0, this.pages.length - 1);
        this.pages = [].concat(head, pagesToAdd, this.pages);
        let index = this.pageFlip.getCurrentPageIndex();
        if (this.bookState === BookState.EDIT) {
            this.switchToEditMode();
        }
        else if (this.bookState === BookState.VIEW) {
            this.switchToViewMode();
        }
        this.turnToPage(index);
    }
}
