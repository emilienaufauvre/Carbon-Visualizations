const print_stacked_graph = function (country) {

  // Set the dimensions and margins of the graph.
  const margin = { top: 60, right: 230, bottom: 50, left: 50 },
    width = 1000 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Append the svg object to the body of the page.
  const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      `translate(${margin.left}, ${margin.top})`);

  // Parse data and create graph.
  d3.tsv("../data/missions.tsv", d => (
    {
      mission_id: d['#mission_id'],
      user_id: d.user_id,
      place_id: d.place_id,
      date: d3.timeParse("%Y-%m-%d")(d.date),
      duration: +d.duration,
      mode_transport: d.mode,
      co2: +d.co2,
    }
  )).then(function (data) {

    //Filter for the country
    
    //data = data.filter(d => d.country == country);
    /**
     * Key selection.
     */

    // We select the mode of transports in the data; 
    // each transport will be a key (color/curve) of our stacked graph. 
    const modes_transports = d3.map(data, function (d) { return d.mode_transport; });
    const keys = [... new Set(modes_transports)];

    // We associate a color with each key (#transports <= 7).
    const color = d3.scaleOrdinal()
      .domain(keys)
      .range(d3.schemeCategory10);

    //stack the data????????????????????
    const stackedData = d3.stack()
      .keys(keys)
      (data)

    /**
     * Axes.
     */

    // Add X axis.
    const x = d3.scaleTime()
      .domain(d3.extent(data, function (d) { return d.date; }))
      .range([0, width]);
    const xAxis = svg.append("g")
      .attr("transform", `translate(0, ${height + 2})`)
      .call(d3.axisBottom(x).ticks().tickSize(6));
    // Add Y axis.
    const y = d3.scaleLinear()
      .domain(d3.extent(data, function (d) { return d.co2; }))
      .range([height, 0]);
    const yAxis = svg.append("g")
      .attr("transform", `translate(${0}, 0)`)
      .call(d3.axisLeft(y).ticks().tickSize(6));

    // Add X axis label.
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 40)
      .text("Date (time)");
    // Add Y axis label.
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", -20)
      .text("Co2 emissions (per person per km)")
      .attr("text-anchor", "start");

    /**
     * Highlight a curve.
     */

    // Handler when a curve is selected (atStart).
    const highlight = function (event, d) {
      // Reduce opacity of all groups.
      d3.selectAll(".myArea").style("opacity", .1)
      // Expect the one that is hovered.
      d3.select("." + d).style("opacity", 1)
    }

    // Handler at the end of the selection (atEnd).
    const noHighlight = function (event, d) {
      d3.selectAll(".myArea").style("opacity", 1)
    }

    /**
     * Legend.
     */

    // Add one dot in the legend for each name/curve/color.
    const dot_size = 20;
    const dist_btw_dot = 5;
    const x_start = 800;
    const y_start = 0;

    svg.selectAll("myrect")
      .data(keys)
      .join("rect")
      .attr("x", x_start)
      .attr("y", function (d, i) { return y_start + i * (dot_size + dist_btw_dot) })
      .attr("width", dot_size)
      .attr("height", dot_size)
      .style("fill", function (d) { return color(d) })
      .on("mouseover", highlight)
      .on("mouseleave", noHighlight)

    svg.selectAll("mylabels")
      .data(keys)
      .join("text")
      .attr("x", x_start + dot_size * 1.2)
      .attr("y", function (d, i) { return y_start + i * (dot_size + dist_btw_dot) + (dot_size / 2) })
      .style("fill", function (d) { return color(d) })
      .text(function (d) { return d })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")
      .on("mouseover", highlight)
      .on("mouseleave", noHighlight)

      /**
       * CHART (AREAS)
       */

      //Helper area function (preparing area)
      const mArea = d3.area()
        .x(function(d) { return d.date })
        .y1(function(d) { return d.co2 })
        .y0(y(0))


      //Add the area on the svg
      svg.append("path")
        .attr("fill",'black')
        .attr("stroke","#69b3a2")
        .attr("d", d3.mArea(data))
        //.style("fill", function (d) { return color(d.key); }




    // TODO vvvvvvvvvvvvvvvvvvvvvvvvvvv









    //////////
    // BRUSHING AND CHART //
    //////////

    // Add a clipPath: everything out of this area won't be drawn.
    /*const clip = svg.append("defs").append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);

    // Add brushing
    const brush = d3.brushX()                 // Add the brush feature using the d3.brush function
      .extent([[0, 0], [width, height]]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
      .on("end", updateChart) // Each time the brush selection changes, trigger the 'updateChart' function

    // Create the scatter variable: where both the circles and the brush take place
    const areaChart = svg.append('g')
      .attr("clip-path", "url(#clip)")

    // Area generator
    const area = d3.area()
      .x(function (d) { return x(d.data.date); })
      .y0(function (d) { return y(d[0]); })
      .y1(function (d) { return y(d[1]); })

    // Show the areas
    areaChart
      .selectAll("mylayers")
      .data(stackedData)
      .join("path")
      .attr("class", function (d) { return "myArea " + d.key })
      .style("fill", function (d) { return color(d.key); })
      .attr("d", area)

    // Add the brushing
    areaChart
      .append("g")
      .attr("class", "brush")
      .call(brush);

    let idleTimeout
    function idled() { idleTimeout = null; }

    // A function that update the chart for given boundaries
    function updateChart(event, d) {

      extent = event.selection

      // If no selection, back to initial coordinate. Otherwise, update X axis domain
      if (!extent) {
        if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
        x.domain(d3.extent(data, function (d) { return d.duration; }))
      } else {
        x.domain([x.invert(extent[0]), x.invert(extent[1])])
        areaChart.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
      }

      // Update axis and area position
      xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5))
      areaChart
        .selectAll("path")
        .transition().duration(1000)
        .attr("d", area)
    }*/
  })
}


print_stacked_graph("France");