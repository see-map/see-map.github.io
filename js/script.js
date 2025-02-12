document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggle-instructions");
    const instructionsPanel = document.getElementById("instructions-panel");

    toggleButton.addEventListener("click", function () {
        instructionsPanel.classList.toggle("show");
        toggleButton.innerHTML = instructionsPanel.classList.contains("show")
            ? "Changelog ▲"
            : "Changelog ▼";
    });

    const resetButton = document.getElementById("reset-atms");
    resetButton.addEventListener("click", function () {
        // 1. Töröljük az ATM-ek mentett állapotát
        localStorage.removeItem("atmStates");

        // 2. Minden marker visszaállítása fúratlan állapotba
        Object.values(groupMarkers).flat().forEach(marker => {
            marker.setIcon(L.icon({
                iconUrl: "images/atm-icon.png",
                iconSize: [32, 32]
            }));
        });

        // 3. Checkboxok visszaállítása alapértelmezett állapotra (minden bepipálva)
        document.querySelectorAll('input[name="group"]').forEach(checkbox => {
            checkbox.checked = true;
        });

        // 4. Frissítjük a látható csoportokat és az információs panelt
        updateVisibleGroups();
        updateInfoPanel();

        // 5. Weboldal újratöltése (cache törléssel)
        location.reload(true); // Hard reload, hogy a cache is törlődjön
    });

    // Alapértelmezett jobbklikk menü tiltása
    document.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    });

    const map = L.map("map", {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2
    });

    const bounds = [[0, 0], [3500, 4000]];
    const image = L.imageOverlay("images/map-image-new.png", bounds).addTo(map);
    map.fitBounds(bounds);

    const savedAtmStates = JSON.parse(localStorage.getItem("atmStates")) || {};

    const groupMarkers = {
        "Los Santos": [],
        "San Fierro": [],
        "Red County": [],
        "Flint County": [],
        "Tierra Robada": []
    };

    fetch("atm-locations.json")
        .then(response => response.json())
        .then(atms => {
            atms.forEach(atm => {
                const iconUrl = savedAtmStates[atm.id] === "megfurt"
                    ? "images/atm-megfurt.png"
                    : "images/atm-icon.png";

                const marker = L.marker([atm.latitude, atm.longitude], {
                    icon: L.icon({
                        iconUrl: iconUrl,
                        iconSize: [32, 32]
                    })
                }).addTo(map);

                marker.bindPopup(`<strong>${atm.name}</strong><br>${atm.description}`);

                if (groupMarkers[atm.group]) {
                    groupMarkers[atm.group].push(marker);
                }

                marker.on("contextmenu", function () {
                    if (savedAtmStates[atm.id] === "megfurt") {
                        delete savedAtmStates[atm.id];
                        marker.setIcon(L.icon({
                            iconUrl: "images/atm-icon.png",
                            iconSize: [32, 32]
                        }));
                    } else {
                        savedAtmStates[atm.id] = "megfurt";
                        marker.setIcon(L.icon({
                            iconUrl: "images/atm-megfurt.png",
                            iconSize: [32, 32]
                        }));
                    }
                    localStorage.setItem("atmStates", JSON.stringify(savedAtmStates));
                    updateInfoPanel();
                });
            });

            updateVisibleGroups();
        });

    function updateVisibleGroups() {
        const selectedGroups = Array.from(document.querySelectorAll('input[name="group"]:checked'))
            .map(checkbox => checkbox.value);

        for (const group in groupMarkers) {
            groupMarkers[group].forEach(marker => map.removeLayer(marker));
        }

        selectedGroups.forEach(group => {
            if (groupMarkers[group]) {
                groupMarkers[group].forEach(marker => map.addLayer(marker));
            }
        });

        updateInfoPanel();
    }

    const coordinateDisplay = document.createElement("div");
    coordinateDisplay.className = "coordinate-display";
    document.body.appendChild(coordinateDisplay);

    let lastMousePosition = null;

    map.on("mousemove", function (e) {
        const { lat, lng } = e.latlng;
        lastMousePosition = { lat, lng };
        coordinateDisplay.textContent = `Koordináták: ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        updateInfoPanel();
    });

    // "C" billentyűvel koordináták másolása
    document.addEventListener("keydown", function (e) {
        if (e.key.toLowerCase() === "c") {
            if (lastMousePosition) {
                const { lat, lng } = lastMousePosition;
                const coordinates = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
                navigator.clipboard.writeText(coordinates)
                    .then(() => alert(`Koordináták vágólapra másolva: ${coordinates}`))
                    .catch(() => alert("Hiba a koordináták másolása során."));
            } else {
                alert("Koordináták nem érhetők el. Mozgasd az egeret a térképen.");
            }
        }
    });

    const infoPanel = document.createElement("div");
    infoPanel.id = "info-panel";
    document.body.appendChild(infoPanel);

    function updateInfoPanel() {
        const savedAtmStates = JSON.parse(localStorage.getItem("atmStates")) || {};
        const totalAtms = Object.values(groupMarkers).flat().length;
        const megfurtCount = Object.values(savedAtmStates).filter(state => state === "megfurt").length;
        const furedtlenCount = totalAtms - megfurtCount;

        const coordinateText = lastMousePosition
            ? `Koordináták: ${lastMousePosition.lat.toFixed(2)}, ${lastMousePosition.lng.toFixed(2)}`
            : "Koordináták: Nincs elérhető";

        infoPanel.innerHTML = `
            
            <p>Összes: ${totalAtms}</p>
            <p>Fúratlan: ${furedtlenCount}</p>
            <p>Megfúrt: ${megfurtCount}</p>
            <hr>
            <p>${coordinateText}</p>
        `;
    }

    document.querySelectorAll('input[name="group"]').forEach(checkbox => {
        checkbox.addEventListener("change", updateVisibleGroups);
    });

    updateInfoPanel();
});
