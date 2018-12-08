// Add/remove animation classes to the park card
// ============================================================================
const cards = document.querySelectorAll(".gallery.card");

for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener("mouseenter", function() {
        this.classList.add("animated");
        this.classList.add("pulse");
    });
    cards[i].addEventListener("mouseleave", function() {
        this.classList.remove("animated");
        this.classList.remove("pulse");
    });
}