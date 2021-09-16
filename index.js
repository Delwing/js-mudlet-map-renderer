const Renderer = require("./map-fragment/draw/renderer").Renderer;
const Settings = require("./map-fragment/draw/renderer").Settings;
const MapReader = require("./map-fragment/reader/MapReader").MapReader;

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

const plDirs = {
    north: "polnoc",
    south: "poludnie",
    east: "wschod",
    west: "zachod",
    northeast: "polnocny-wschod",
    northwest: "polnocny-zachod",
    southeast: "poludniowy-wschod",
    southwest: "poludniowy-zachod",
    up: "gora",
    down: "dol",
};

class PageControls {
    constructor(reader) {
        this.map = jQuery("#map");
        this.map.on("roomSelected", (event) => this.selectRoom(event.detail));
        this.map.on("roomDeselected", () => this.deselectRoom());
        this.map.on("zoom", (event) => this.adjustZoomBar(event.detail));
        this.map.on("goToArea", (event) => setTimeout(() => this.renderArea(event.detail.area, event.detail.z), 0.1));
        this.reader = reader;
        this.select = jQuery("#area");
        this.infoBox = jQuery(".info-box");
        this.levels = jQuery(".levels");
        this.saveImageButton = jQuery(".save-image");
        this.copyImageButton = jQuery(".copy-image");
        this.zoomButton = jQuery(".zoom-controls .btn");
        this.toastContainer = jQuery(".toast");
        this.searchModal = jQuery("#search");
        this.search = jQuery(".search-form");
        this.helpModal = jQuery("#help");
        this.zoomBar = jQuery(".progress-container");
        this.settingsModal = jQuery("#settings");
        this.settingsForm = jQuery("#settings form");
        this.settings = new Settings();
        this.zIndex = 0;
        let loaded = localStorage.getItem("settings");
        if (loaded) {
            Object.assign(this.settings, JSON.parse(loaded));
        }

        jQuery(".btn").on("click", function () {
            jQuery(this).blur();
        });

        this.levels.on("click", ".btn-level", (event) => {
            event.preventDefault();
            let zIndex = parseInt(jQuery(event.target).attr("data-level"));
            this.renderArea(this.select.val(), zIndex);
        });

        this.saveImageButton.on("click", () => this.saveImage());

        this.copyImageButton.on("click", () => this.copyImage());

        this.zoomButton.on("click", (event) => {
            let delta = parseFloat(jQuery(event.currentTarget).attr("data-factor"));
            this.renderer.controls.deltaZoom(delta);
        });

        this.search.on("submit", (event) => {
            event.preventDefault();
            this.submitSearch(event);
        });

        this.searchModal.on("shown.bs.modal", () => {
            this.searchModal.find("input").first().focus();
        });

        this.settingsModal.on("shown.bs.modal", () => {
            this.populateSettings();
            this.settingsModal.find("input").first().focus();
        });

        this.settingsForm.on("submit", (event) => {
            event.preventDefault();
            this.handleSaveSettings();
        });

        jQuery(window).on("resize", () => {
            this.render()
        });

        jQuery("body").on("click", "[data-room]", (event) => {
            event.preventDefault();
            this.findRoom(parseInt(jQuery(event.currentTarget).attr("data-room")));
        });
    }

    handleSaveSettings() {
        let inputs = this.settingsModal.find("input");

        let formData = {};
        inputs.each((index, element) => {
            let name = jQuery(element).attr("name");
            let type = jQuery(element).attr("type");
            if (type === "checkbox") {
                formData[name] = jQuery(element).is(":checked");
            } else if (type === "number") {
                formData[name] = parseInt(jQuery(element).val());
            } else {
                formData[name] = jQuery(element).val();
            }
        });

        Object.assign(this.settings, formData);

        this.showToast("Zapisano ustawienia");
        this.settingsModal.modal("toggle");
        this.saveSettings();
        this.render();
    }

    saveSettings() {
        localStorage.setItem("settings", JSON.stringify(this.settings));
    }

    render() {
        this.renderArea(this.select.val(), this.zIndex);
    }

    renderArea(areaId, zIndex) {
        let area = this.reader.getArea(areaId, zIndex);
        console.log(area)
        if (this.renderer) {
            this.renderer.clear();
        }
        this.renderer = new Renderer(document.getElementById("map"), this.reader, area, this.reader.getColors(), this.settings);
        this.renderer.render();
        this.select.val(areaId);
        this.populateLevelButtons(area.getLevels(), zIndex);
        this.zIndex = zIndex;
    }

    genericSetup() {
        document.querySelectorAll(".btn").forEach((element) => element.addEventListener("click", () => element.blur()));
    }

    populateLevelButtons(levelsSet, zIndex) {
        this.levels.html("");
        if (levelsSet.size <= 1) {
            return;
        }
        let levelsSorted = Array.from(levelsSet).sort(function (a, b) {
            return a - b;
        });

        if (levelsSorted.length > 10) {
            let container = jQuery('<div class="dropdown"></div>');
            let button = jQuery('<button class="btn btn-secondary dropdown-toggle" type="button" data-toggle="dropdown">' + zIndex + "</button>");
            let menu = jQuery('<div class="dropdown-menu" aria-labelledby="dropdownMenuButton"></div>');
            container.append(button);
            container.append(menu);
            for (let level of levelsSorted) {
                menu.append('<a class="dropdown-item btn-level" href="#" data-level="' + level + '">' + level + "</a>");
            }
            this.levels.append(container);
        } else {
            for (let level of levelsSorted) {
                let classes = "btn btn-level";
                if (level === zIndex) {
                    classes += " btn-primary";
                } else {
                    classes += " btn-secondary";
                }
                this.levels.append('<button type="button" class="' + classes + '" data-level="' + level + '">' + level + "</button>");
            }
        }
    }

    populateSelectBox() {
        this.reader.getAreas().forEach((areaElement, index) => {
            if (!areaElement.rooms.length) {
                return;
            }
            this.select.append(new Option(areaElement.areaName, areaElement.areaId));
        });
        this.select.on("change", (event) => {
            this.renderArea(event.target.value, 0);
        });
    }

    submitSearch() {
        this.searchModal.modal("toggle");
        let inputs = this.search.find(":input");

        let formData = {};
        inputs.each((index, element) => {
            formData[element.name] = jQuery(element).val();
            jQuery(element).val("");
        });

        if (formData.roomId !== undefined) {
            this.findRoom(parseInt(formData.roomId));
        }
    }

    findRoom(id) {
        let area = this.reader.getAreaByRoomId(id);
        if (area !== undefined) {
            this.renderArea(area.areaId, area.zIndex);
            this.renderer.controls.setZoom(1);
            this.renderer.controls.centerRoom(id);
        } else {
            this.showToast("Nie znaleziono takiej lokacji");
        }
    }

    adjustZoomBar(view) {
        let percentage = (view.zoom - view.minZoom) / (10 - view.minZoom);

        this.zoomBar.find(".progress-bar").css("width", percentage * 100 + "%");
        let that = this;
        if (!this.zoomBar.is(":visible")) {
            this.zoomBar.fadeIn();
            this.progressTimeout = setTimeout(function () {
                that.zoomBar.fadeOut();
            }, 3000);
        } else {
            if (this.progressTimeout !== undefined) {
                clearTimeout(this.progressTimeout);
                this.progressTimeout = undefined;
            }
            this.progressTimeout = setTimeout(function () {
                that.zoomBar.fadeOut("slow");
            }, 3000);
        }
    }

    selectRoom(room) {
        this.showRoomInfo(room);
    }

    deselectRoom() {
        this.hideRoomInfo();
    }

    showRoomInfo(room) {
        this.infoBox.toggle(true);
        this.infoBox.find(".room-id").html(room.id);
        this.infoBox.find(".room-name").html(room.name);
        this.infoBox.find(".room-env").html(room.env);
        this.infoBox.find(".coord-x").html(room.x);
        this.infoBox.find(".coord-y").html(room.y);
        this.infoBox.find(".coord-z").html(room.z);
        this.infoBox.find(".room-hash").html("");
        this.infoBox.find(".room-hash").html(room.hash);

        this.infoExitsGroup(this.infoBox.find(".exits"), room.exits);
        this.infoExitsGroup(this.infoBox.find(".special"), room.specialExits);

        this.userDataGroup(this.infoBox.find(".userData"), room.userData);
    }

    userDataGroup(container, userData) {
        let containerList = container.find("ul");
        containerList.html("");
        let show = false;
        for (let userDataKey in userData) {
            show = true;
            containerList.append("<li>" + userDataKey + ":<br>&nbsp; &nbsp; &nbsp;" + userData[userDataKey] + "</li>");
        }
        container.toggle(show);
    }

    infoExitsGroup(container, exits) {
        let containerList = container.find("ul");
        containerList.html("");
        let show = false;
        for (let exit in exits) {
            show = true;
            containerList.append(this.infoExit(exit, exits[exit]));
        }
        container.toggle(show);
    }

    infoExit(exit, id) {
        let areaLink = "";
        let destRoom = this.reader.getRoomById(id);
        if (destRoom.area !== this.renderer.area.areaId) {
            let area = this.reader.getAreaProperties(destRoom.area);
            areaLink = " ->  " + '<a href="#" data-room="' + destRoom.id + '">' + area.areaName + "</a>";
        }
        return "<li>" + this.translateDir(exit) + " : " + '<a href="#" data-room="' + id + '">' + id + "</a>" + areaLink + "</li>";
    }

    showToast(text) {
        this.toastContainer.find(".toast-body").html(text);
        this.toastContainer.toast("show");
    }

    translateDir(dir) {
        if (plDirs.hasOwnProperty(dir)) {
            return translateString(plDirs[dir]);
        }
        return dir;
    }

    hideRoomInfo() {
        this.infoBox.toggle(false);
    }

    populateSettings() {
        for (let setting in this.settings) {
            let input = this.settingsModal.find("input[name='" + setting + "']");
            if (input.attr("type") === "checkbox") {
                input.attr("checked", this.settings[setting]);
            } else {
                input.val(this.settings[setting]);
            }
        }
    }

    saveImage() {
        let a = jQuery("<a>")
            .attr("href", this.map[0].toDataURL())
            .attr("download", this.renderer.area.areaName + ".png")
            .appendTo("body");
        a[0].click();
        a.remove();
    }

    copyImage() {
        if (typeof ClipboardItem !== "undefined") {
            this.map[0].toBlob((blob) => navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]));
            this.showToast(translateString("Skopiowano do schowka"));
        } else {
            this.showToast("Twoja przeglądarka nie wspiera kopiowania do schowka");
        }
        this.toastContainer.toast("show");
    }

    move(x, y) {
        this.renderer.controls.move(x, y);
    }

    goDirection(directionKey) {
        let fullDirection = dirsShortToLong(directionKey);
        if (this.renderer.controls.selected) {
            this.findRoom(this.renderer.controls.selected.exits[fullDirection]);
        }
    }

    registerKeyBoard() {
        let directionKeys = {
            Numpad1: "sw",
            Numpad2: "s",
            Numpad3: "se",
            Numpad4: "w",
            Numpad6: "e",
            Numpad7: "nw",
            Numpad8: "n",
            Numpad9: "ne",
            NumpadMultiply: "u",
            NumpadDivide: "d",
        };

        window.addEventListener("keydown", (event) => {
            if (this.settings.disableKeyBinds) {
                return;
            }

            if (event.code === "F1") {
                event.preventDefault();
                this.showHelp();
            }

            if (directionKeys.hasOwnProperty(event.code)) {
                this.goDirection(directionKeys[event.code]);
                event.preventDefault();
            }

            console.log(event)

            if (event.ctrlKey && event.key === "KeyF") {
                event.preventDefault();
                this.showSearch();
            }
        });

        window.addEventListener("keydown", (event) => {
            if (jQuery("input").is(":focus")) {
                return;
            }

            if (event.ctrlKey && event.code === "KeyS") {
                this.saveImage();
                event.preventDefault();
            }

            if (event.code === "Equal") {
                this.renderer.controls.deltaZoom(1.1);
                event.preventDefault();
            }

            if (event.code === "Minus") {
                this.renderer.controls.deltaZoom(0.9);
                event.preventDefault();
            }

            if (event.code === "ArrowUp") {
                this.move(0, -1);
                event.preventDefault();
            }
            if (event.code === "ArrowDown") {
                this.move(0, 1);
                event.preventDefault();
            }
            if (event.code === "ArrowLeft") {
                this.move(-1, 0);
                event.preventDefault();
            }
            if (event.code === "ArrowRight") {
                this.move(1, 0);
                event.preventDefault();
            }
        });
    }

    showHelp() {
        this.helpModal.modal('show');
    }

    showSearch() {
        this.searchModal.modal('show');
    }
}

let controls = new PageControls(new MapReader(mapData, colors));
controls.genericSetup();
controls.populateSelectBox();
controls.renderArea(params.area, 0);
controls.registerKeyBoard();

let dirs = {
    north: "n",
    south: "s",
    east: "e",
    west: "w",
    northeast: "ne",
    northwest: "nw",
    southeast: "se",
    southwest: "sw",
    up: "u",
    down: "d",
};

function getKeyByValue(obj, val) {
    for (let k in obj) {
        if (obj.hasOwnProperty(k) && obj[k] === val) {
            return k;
        }
    }
}

function dirsShortToLong(dir) {
    let result = getKeyByValue(dirs, dir);
    return result !== undefined ? result : dir;
}
