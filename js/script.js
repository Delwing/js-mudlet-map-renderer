jQuery(function () {

    let saveImageButton = jQuery(".save-image");
    let copyImageButton = jQuery(".copy-image");
    let zoomButton = jQuery(".zoom-controls .btn");
    let toastContainer = jQuery('.toast');
    let searchModal = jQuery('#search');
    let search = jQuery(".search-form");
    let helpModal = jQuery("#help");
    let zoomBar = jQuery(".progress-container");
    let settingsModal = jQuery("#settings");
    let settingsForm = jQuery("#settings form");

    function showToast(text) {
        this.toastContainer.find(".toast-body").html(text);
        this.toastContainer.toast('show')
    }

    function showHelp() {
        this.helpModal.modal('show');
    }

});
