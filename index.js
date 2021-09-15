const paper = require("paper");
const Renderer = require("./map-fragment/draw/renderer").Renderer;
const MapReader = require("./map-fragment/reader/MapReader").MapReader;

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

class PageControls {
    constructor(reader) {
        jQuery("#map").on("roomSelected", (event) => this.selectRoom(event.detail));
        jQuery("#map").on("roomDeselected", (event) => this.deselectRoom());
        this.reader = reader;
        this.select = jQuery("#area");
        this.infoBox = jQuery(".info-box");
    }

    renderArea(areaId, zIndex) {
        let area = this.reader.getArea(areaId, zIndex);
        this.renderer = new Renderer(document.getElementById("map"), this.reader, area, this.reader.getColors(), { grideSize: 2, roomSize: 1 });
        this.renderer.render();
        this.select.val(areaId);
    }

    genericSetup() {
        document.querySelectorAll(".btn").forEach((element) => element.addEventListener("click", () => element.blur()));
    }

    populateSelectBox() {
        this.reader.getAreas().forEach((areaElement, index) => {
            if (!areaElement.rooms.length) {
                return;
            }
            this.select.append(new Option(areaElement.areaName, areaElement.areaId));
        });
        this.select.on("change", (event) => {
            console.log(event.target);
            this.renderArea(event.target.value, 0);
        });
    }

    selectRoom(room) {
        this.showRoomInfo(room);
    }

    deselectRoom(room) {
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
    }

    hideRoomInfo() {
        this.infoBox.toggle(false);
    }
}

let controls = new PageControls(new MapReader(mapData, colors));
controls.genericSetup();
controls.populateSelectBox();
controls.renderArea(params.area, 0);
