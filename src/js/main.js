Themes.setBackground();

BubbleMap.printBubbleMap("#bubble_map");

function changeMode() {
    // Get the checkbox
    var checkBox = document.getElementById("switch");
  
    // Change mode for the stacked graph.
    if (checkBox.checked == true){
      BubbleMap.changeMode(true);
    } else {
      BubbleMap.changeMode(false);
    }
  }