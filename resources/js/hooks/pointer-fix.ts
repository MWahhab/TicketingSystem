export function fixPointerEventsGlobally() {
    const observer = new MutationObserver(() => {
        if (document.body.style.pointerEvents === "none") {
            document.body.style.pointerEvents = "auto"
        }
    })

    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] })
}