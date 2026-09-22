/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

(async () => {
  const triggerButton = document.querySelector(".modal-trigger");
  window.addEventListener("load", () => {
    if (configuration.modalOverlayColor) {
      document.body.classList.add(
        "modal-overlay-" + configuration.modalOverlayColor
      );
    }

    if (document.querySelector("body.has-edit-mode-menu")) {
      return;
    }

    if (!triggerButton || !configuration.modalId) return;

    if (configuration.contentInitEvent) {
      document.addEventListener(configuration.contentInitEvent, () => {
        setupModal(triggerButton);
      });
    } else {
      setupModal(triggerButton);
    }
  });

  function setupModal(button) {
    const modal = document.getElementById(configuration.modalId);
    if (!modal) return;
    const modalContent = modal.firstElementChild;

    button.addEventListener("click", () => {
      Liferay.Util.openModal({
        bodyHTML: "<div></div>",
        containerProps: {
          className: "",
        },
        id: "f-modal",
        onOpen() {
          const modalBody = document.querySelector(
            "#f-modal .liferay-modal-body"
          );
          modalBody.appendChild(modalContent);
        },
        size: configuration.modalSize,
        center: true,
      });
    });
  }

  function getLastIdFromUrl() {
    const path = window.location.pathname;
    const parts = path
      .split("/")
      .filter((part) => part.length > 0 && !isNaN(part));
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }

  const objectId = getLastIdFromUrl();
  if (!objectId) {
    return;
  }

  const apiUrl = `/o/c/publisherdetailses/${objectId}`;
  const PROPERTY_TO_CHECK = "showContactForm";

  try {
    const response = await Liferay.Util.fetch(apiUrl);
    if (!response.ok) return;

    const data = await response.json();

    if (String(data[PROPERTY_TO_CHECK]) === "true") {
      triggerButton.style.display = "";

      if (configuration.contentInitEvent) {
        document.addEventListener(configuration.contentInitEvent, () => {
          setupModal(triggerButton);
        });
      } else {
        setupModal(triggerButton);
      }
    }
  } catch (error) {
    console.error("Erro ao verificar visibilidade do fragmento:", error);
  }
})();
