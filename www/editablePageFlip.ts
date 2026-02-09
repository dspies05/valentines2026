type HTMLPage = any;
type PageFlip = any;
type FlipSetting = any;
type Editor = any;

declare const tinymce: any;
declare const St: any;

const PageFlip = (typeof window !== "undefined" && (window as any).St)
  ? (window as any).St.PageFlip
  : St.PageFlip;

enum BookState{
        VIEW,
        EDIT,
        UNKNOWN
}

enum PageState {
    FRONTCOVER,
    BACKCOVER,
    SPREAD,
    UNKNOWN
}

function images_upload_handler(blobInfo: any): Promise<string> {
  const apiBase = (window as any).API_BASE_URL || "http://localhost:3001";
  const formData = new FormData();
  formData.append("file", blobInfo.blob(), blobInfo.filename());

  return fetch(`${apiBase}/api/images`, { method: "POST", body: formData })
    .then(async (res) => {
      if (!res.ok) {
        let message = "Upload failed.";
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}
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

export class EditablePageFlip{
    private pageFlip: PageFlip;
    private pages: HTMLElement[] = [];
    private pageState: PageState = PageState.UNKNOWN;
    private bookState: BookState = BookState.VIEW;
    private bookCopy: Node;
    private book: HTMLElement;
    private bookContainer: HTMLElement;
    private pageFlipConfig: Partial<FlipSetting> = {
        width: 440,
        height: 520,
        size: "fixed",
        maxShadowOpacity: 0.5,
        showCover: true,
        mobileScrollSupport: false,
    }
    private editorConfig: any = {
        license_key: "gpl",
        menubar: false,
        statusbar: false,
        plugins: "image",
        toolbar: "undo redo | bold italic underline | bullist numlist | image",
        images_upload_handler: images_upload_handler
    };
    private editors: Editor[] = [];

    constructor(book:HTMLElement, editorConfig: any = {}, pageFlipConfig: Partial<FlipSetting> = {}){
        this.book = book;
        this.bookCopy = this.book.cloneNode();
        this.bookContainer = this.book.parentElement || document.body;
        this.pageFlip = new PageFlip(this.book, this.pageFlipConfig);
        this.editorConfig = Object.assign(this.editorConfig, editorConfig);
        this.pageFlipConfig = Object.assign(this.pageFlipConfig, pageFlipConfig)
        this.addPageStateHandler();
    }

    public loadFromHTML(items: HTMLElement[]): void {
        this.pages = Array.from(items);
        this.pageFlip.loadFromHTML(items)
    }

    private createEditor(target: HTMLElement) : void {
        tinymce.init({
                target: target,
                setup: (ed : Editor) => {
                    this.editors.push(ed);
                },
                ...this.editorConfig
        });
    }

    private destroyEditors() : void {
        this.editors.forEach(e => e.destroy());
        this.editors = [];
    }

    private addPageStateHandler() : void {
        this.pageFlip.on("flip", (e : any) => {
        const last = this.pageFlip.getPageCount() - 1;

        if (e.data === 0) {
            this.pageState = PageState.FRONTCOVER;
        } else if (e.data === last) {
            this.pageState = PageState.BACKCOVER;
        } else {
            this.pageState = PageState.SPREAD;
        }
        });
    }

    private switchToEditMode() : void {
        this.book.remove();
        this.bookContainer.appendChild(this.bookCopy);
        this.book = <HTMLElement>this.bookContainer.children[0];
        this.bookCopy = this.book.cloneNode();
        this.pageFlip = new PageFlip(this.book, {...this.pageFlipConfig, disableFlipByClick: true, useMouseEvents: false});
        this.pageFlip.loadFromHTML(this.pages);
        this.addPageStateHandler();
    }

     private switchToViewMode() : void {
        this.book.remove();
        this.bookContainer.appendChild(this.bookCopy);
        this.book = <HTMLElement>this.bookContainer.children[0];
        this.bookCopy = this.book.cloneNode();
        this.pageFlip = new PageFlip(this.book, this.pageFlipConfig);
        this.pageFlip.loadFromHTML(this.pages);
        this.addPageStateHandler();
    }

    public turnToPage(index: number) : void{
        this.pageFlip.turnToPage(index);
    }

    public editPage() : void {
        if(this.bookState === BookState.EDIT) return;
        let index: number = this.pageFlip.getCurrentPageIndex();
        this.switchToEditMode();
        this.turnToPage(index);

        if(this.pageState === PageState.SPREAD){
            let leftPage: HTMLPage = (this.pageFlip.getPage(index) as HTMLPage)
            let leftPageContent: HTMLElement = leftPage.getElement().children[0] as HTMLElement;
            let rightPage: HTMLPage = (this.pageFlip.getPage(index+1) as HTMLPage)
            let rightPageContent: HTMLElement = rightPage.getElement().children[0] as HTMLElement;
            this.createEditor(leftPageContent);
            this.createEditor(rightPageContent);
        }
        else{
            let cover: HTMLPage = (this.pageFlip.getPage(index) as HTMLPage)
            let coverContent: HTMLElement = cover.getElement().children[0] as HTMLElement;
            this.createEditor(coverContent);
        }
        this.bookState = BookState.EDIT;
    }

    public viewPage() : void {
        if(this.bookState === BookState.VIEW) return;
        let index: number = this.pageFlip.getCurrentPageIndex();
        this.switchToViewMode();
        this.turnToPage(index);
        this.destroyEditors();
        this.bookState = BookState.VIEW;
    }

    public getBookState() : BookState{
        return this.bookState;
    }

    public getPageState(): PageState{
        return this.pageState;
    }

    public getPages(): HTMLElement[] | NodeListOf<HTMLElement>{
        return this.pages;
    }

    public appendPages(pages: HTMLElement[] | NodeListOf<HTMLElement>): void{
        let pagesToAdd = Array.from(pages);
        let head = this.pages.splice(0, this.pages.length - 1)
        this.pages = [].concat(head, pagesToAdd, this.pages);
        let index: number = this.pageFlip.getCurrentPageIndex();
        if(this.bookState === BookState.EDIT){
            this.switchToEditMode();
        }
        else if (this.bookState === BookState.VIEW){
            this.switchToViewMode();
        }
        this.turnToPage(index);
    }
}