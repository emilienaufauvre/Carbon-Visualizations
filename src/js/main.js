/**
 * Define the graph colors.
 */
const Themes = Object.freeze({
    LIGHT: Symbol("light"),
    DARK: Symbol("dark"),
});

const Theme = Themes.DARK;

const setBackground = () => {
    d3.select("body")
        .style("background", Theme == Themes.DARK ? "#1b1e23" : "none")
}

setBackground();
printBubbleMap();
printStackedGraph("FR", Modes.DATE);