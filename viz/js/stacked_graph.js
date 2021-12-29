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
      place_id: +d.place_id,
      date: d3.timeParse("%Y-%m-%d")(d.date),
      duration: +d.duration,
      mode_transport: d.mode,
      co2: +d.co2,
    }
  )).then(function (data) {

    var areaChart = svg.append('g')
      .attr("clip-path", "url(#clip)")

    /**
     * Country selection.
     */

    // We select only the data corresponding to the
    // given country.
    if (country != -1) {
      data = data.filter(d => d.place_id == country);
    }

    /**
     * Key selection.
     */

    // We find each mode of transport of our dataset.
    // Each of these will be a key (i.e. a color/curve/area of the graph).
    const modes_transports = d3.map(data, d => d.mode_transport);
    const keys = [... new Set(modes_transports)];

    // We associate a color with each key (#transports <= 7).
    const color = d3.scaleOrdinal()
      .domain(keys)
      .range(d3.schemeCategory10);

    /**
     * Building and printing the areas.
     */

    // We sort the data using the duration as the comparator.
    data.sort((d1, d2) => d1.duration - d2.duration);

    // We group the data such that each value of the X axis
    // is represented by an array.
    const xArrays = d3.group(data, d => d.duration);

    // Then we fulfill the array such that for each X value, 
    // we have the average co2 of each transport.
    const new_xArrays = [];

    xArrays.forEach(row => {

      const new_row = [];

      keys.forEach(k => {

        previous_sum = (new_xArrays.length == 0) ? 0 : new_xArrays.at(-1)[k].co2;
        sum = 0;
        i = 1;
        duration = 0;

        row.forEach(d => {

          duration = d.duration;

          if (d.mode_transport == k) {
            sum += d.co2;
            i++;
          }
        });

        const new_d = {
          duration: duration,
          mode_transport: k,
          co2: sum != 0 ? (sum / i) : previous_sum / 2,
        }

        new_row[k] = new_d;
      });

      new_xArrays.push(new_row);
    })

    // We compute the Y values for each transport depending 
    // on the previous X values.
    const yArrays = d3.stack()
      .keys(keys)
      .value((d, key) => d[key].co2)
      (new_xArrays)

    // We determine the maximum value in Y.
    maxYval = 0;
    yArrays.forEach(d => d.forEach(d_ => maxYval = Math.max(maxYval, d_[1])));
    // Then we can define the axis scales.
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.duration))
      .range([0, width]);
    const y = d3.scaleLinear()
      .domain([0, maxYval])
      .range([height, 0])
      .nice();

    // We generate areas.  
    const area = d3.area()
      .x(d => x(d.data.public.duration))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    // We print the areas.
    areaChart.selectAll("mylayers")
      .data(yArrays)
      .join("path")
        .style("fill", d => color(d.key))
        .attr("class", function(d) { return "myArea " + d.key })
        .attr("d", area);

    /**
     * Brushing.
     */

    // Add a clipPath: everything out of this area won't be drawn.
    const clip = svg.append("defs").append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);

    const brush = d3.brushX()                 
      .extent([[0, 0], [width, height]])
      .on("end", updateChart) 

    areaChart
      .append("g")
      .attr("class", "brush")
      .call(brush);

    let idleTimeout
    function idled() { idleTimeout = null; }

    // Update the chart for given boundaries.
    function updateChart(event, d) {

      extent = event.selection

      // If no selection, back to initial coordinate. Otherwise, update X axis domain.
      if (!extent) {
        if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); 
        x.domain(d3.extent(data, function (d) { return d.year; }))
      } 
      else {
        x.domain([x.invert(extent[0]), x.invert(extent[1])])
        areaChart.select(".brush").call(brush.move, null) 
      }

      // Update axis and area position.
      xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5))
      areaChart
        .selectAll("path")
        .transition().duration(1000)
        .attr("d", area)
    }

    /**
     * Highlight an area.
     */

    // Handler when an area is selected (atStart).
    const highlight = (event, d) => {
      // Reduce opacity of all groups.
      d3.selectAll(".myArea").style("opacity", .1)
      // Expect the one that is hovered.
      d3.select("." + d).style("opacity", 1)
    }

    // Handler at the end of the selection (atEnd).
    const noHighlight = (event, d) => {
      d3.selectAll(".myArea").style("opacity", 1)
    }

    /**
     * Axes.
     */

    // Add X axis.
    const xAxis = svg.append("g")
      .attr("transform", `translate(0, ${height + 2})`)
      .call(d3.axisBottom(x).ticks().tickSize(6));
    // Add Y axis.
    const yAxis = svg.append("g")
      .attr("transform", `translate(${0}, 0)`)
      .call(d3.axisLeft(y).ticks().tickSize(6));

    // Add X axis label.
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 40)
      .text("Duration (hours)");
    // Add Y axis label.
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", -20)
      .text("Co2 emissions (per person per km)")
      .attr("text-anchor", "start");

    /**
     * Legend.
     */

    // Add one dot in the legend for each area. 
    const dot_size = 20;
    const dist_btw_dot = 5;
    const x_start = 800;
    const y_start = 0;

    svg.selectAll("myrect")
      .data(keys)
      .join("rect")
      .attr("x", x_start)
      .attr("y", (d, i) => y_start + i * (dot_size + dist_btw_dot))
      .attr("width", dot_size)
      .attr("height", dot_size)
      .style("fill", d => color(d))
      .on("mouseover", highlight)
      .on("mouseleave", noHighlight)

    svg.selectAll("mylabels")
      .data(keys)
      .join("text")
      .attr("x", x_start + dot_size * 1.2)
      .attr("y", (d, i) => y_start + i * (dot_size + dist_btw_dot) + (dot_size / 2))
      .style("fill", d => color(d))
      .text(d => d)
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")
      .on("mouseover", highlight)
      .on("mouseleave", noHighlight)
  })
}



print_stacked_graph(-1);