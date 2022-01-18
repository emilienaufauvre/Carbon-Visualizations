// Settings.
Themes.setBackground();

// Visualization.
BubbleMap.printBubbleMap("#bubble_map");

// Switch button
function leftClick() {
    document.getElementById("btn").style.left = "0";
    BubbleMap.printStackedGraph(StackedGraph.Modes.DATE);
}

function rightClick() {
    document.getElementById("btn").style.left = "150px";
    BubbleMap.printStackedGraph(StackedGraph.Modes.DURATION);
}