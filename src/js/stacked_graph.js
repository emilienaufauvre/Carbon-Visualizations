/**
 * Define the dimensions of the graph.
 */
const MarginS = { top: 200, right: 230, bottom: 50, left: 50 };
const WidthS = 1000 - MarginS.left - MarginS.right;
const HeightS = 800 - MarginS.top - MarginS.bottom;

/**
 * Define the x values of the graph.
 */
const Modes = Object.freeze({
    DURATION:   Symbol("duration"),
    DATE:  Symbol("date"),
});



const createSvgS = () => {
    const svg = d3.select("#stacked_graph")
        .append("svg")
            .attr("width", WidthS + MarginS.left 
                + MarginS.right)
            .attr("height", HeightS + MarginS.top 
                + MarginS.bottom)
            .style("color", Theme == Themes.DARK ? 
                "#fff" : "#1b1e23")
        .append("g")
            .attr("transform",
                `translate(${MarginS.left},
                ${MarginS.top})`)
            .attr("fill", Theme == Themes.DARK ? 
                "lightsteelblue" : "steelblue");
    const chart = svg.append("g")
        .attr("clip-path", "url(#clip)");

    return { svg: svg, chart: chart };
}


const getPlaceIdsFromCountry = async alpha2 => {
    let placeIds;

    await d3.tsv("../data/places.tsv", d => (
        {
            placeId: +d["#place_id"],
            distance: +d.distance,
            country: d.country,
        }
    )).then(data => {
        data = data.filter(d => d.country === alpha2);
        placeIds = data.map(d => d.placeId);
    });

    return placeIds;
};


const filterCountry = async (alpha2, data) => {
    if (alpha2 !== "") {
        // Get an array with all the place IDs correcponding
        // to the given country.
        let placeIds = await getPlaceIdsFromCountry(alpha2);
        data = data.filter(d => placeIds.includes(d.placeId));
    }

    return data;
};


const filterMax = (data, mode, maxData) => {
    return data.filter(d => d[mode.description] <= maxData); 
};


const defineKeys = data => {
    const modesTransports = d3.map(data, d => d.modeTransport);
    // Eliminate duplicates.
    const keys = [... new Set(modesTransports)];
    // Associate a color with each key. 
    const colors = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeCategory10);
    return { keys: keys, colors: colors };
}; 


const extractCoordinatesS = (data, mode, keys) => {
    // We sort the data using the mode as the comparator.
    data.sort((d1, d2) => 
        d1[mode.description] - d2[mode.description]);
    // We group the data such that each value of the X axis
    // is represented by an array.
    const xCoord = d3.group(data, d => d[mode.description]);
    // Then we fulfill the array such that for each X value, 
    // we have the average co2 of each transport.
    const xCoordRefined = [];

    xCoord.forEach(row => {
        const rowRefined = [];

        keys.forEach(k => {
            let previousSum = (xCoordRefined.length == 0) ?
                0 : xCoordRefined.at(-1)[k].co2,
                sum = 0,
                i = 1,
                currentMode = 0;

            row.forEach(d => {
                currentMode = d[mode.description];

                if (d.modeTransport == k) {
                    sum += d.co2;
                    i++;
                }
            });

            const dRefined = {
                duration: 0,
                date: 0,
                modeTransport: k,
                co2: sum != 0 ? (sum / i) : previousSum / 2,
            }

            dRefined[mode.description] = currentMode;
            rowRefined[k] = dRefined;
        });

        xCoordRefined.push(rowRefined);
    })

    // We compute the Y values for each transport depending 
    // on these X values.
    return d3.stack()
        .keys(keys)
        .value((d, key) => d[key].co2)
        (xCoordRefined)
};


const getScales = (data, mode, yCoord) => {
    // We determine the maximum value of Y axis.
    yMax = 0;
    yCoord.forEach(d => d.forEach(d_ => 
        yMax = Math.max(yMax, d_[1])));

    let x;

    if (mode == Modes.DURATION) {
        x = d3.scaleLinear()
            .domain(d3.extent(data, d => 
                d[mode.description]))
            .range([0, WidthS]);
    } 
    else if (mode == Modes.DATE) {
        x = d3.scaleTime()
            .domain(d3.extent(data, d => 
                new Date(d[mode.description])))
            .range([0, WidthS]);
    }

    const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([HeightS, 0])
        .nice();

    return { x: x, y: y };
};


const printAreas = (mode, keys, colors, x, y, yCoord, chart) => {
    // Generate areas.  
    const areas = d3.area()
        .x(d => x(d.data.public[mode.description]))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));
    // Print them
    chart.selectAll("myLayers")
        .data(yCoord)
        .join("path")
            .style("fill", d => colors(d.key))
            .attr("class", d => "myArea " + d.key)
            .attr("d", areas);

    return areas;
};


const printAxes = (mode, x, y, svg) => {
    const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${HeightS + 2})`)
        .call(d3.axisBottom(x).ticks().tickSize(6));
    const yAxis = svg.append("g")
        .attr("transform", `translate(${0}, 0)`)
        .call(d3.axisLeft(y).ticks().tickSize(6));

    let xLegend;

    if (mode == Modes.DURATION) {
        xLegend = "Duration (hours)"
    }
    else if (mode == Modes.DATE) {
        xLegend = "Date"
    }

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", WidthS)
        .attr("y", HeightS + 40)
        .text(xLegend);
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", 0)
        .attr("y", -20)
        .text("Co2 emissions (per person per km)")
        .attr("text-anchor", "start");

    return { xAxis: xAxis, yAxis: yAxis };
};


const printLegendS = (mode, keys, colors, svg) => {
    // Add user interaction:
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

    // Add one dot in the legend for each key/area. 
    const dotSize = 20;
    const distBtwDots = 5;
    const xStart = 800;
    const yStart = 0;

    svg.selectAll("myrect")
        .data(keys)
        .join("rect")
            .attr("x", xStart)
            .attr("y", (d, i) => 
                yStart + i * (dotSize + distBtwDots))
            .attr("width", dotSize)
            .attr("height", dotSize)
            .style("fill", d => colors(d))
            .on("mouseover", highlight)
            .on("mouseleave", noHighlight)

    svg.selectAll("mylabels")
        .data(keys)
        .join("text")
            .attr("x", xStart + dotSize * 1.2)
            .attr("y", (d, i) => 
                yStart + i * (dotSize + distBtwDots) 
                + (dotSize / 2))
            .style("fill", d => colors(d))
            .text(d => d)
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
            .on("mouseover", highlight)
            .on("mouseleave", noHighlight)
};


const addSlider = (data, mode, keys, colors, x, y, svg, chart) => {
    const updateChart = val => {

        if (mode == Modes.DURATION) {
            data_ = filterMax(data, Modes.DATE, val);
        }
        else if (mode == Modes.DATE) {
            data_ = filterMax(data, Modes.DURATION, val);
        }

        // Compute changes.
        const yCoord = extractCoordinatesS(data_, mode, keys);
        const areas = d3.area()
            .x(d => x(d.data.public[mode.description]))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]));
        // Print changes.
        chart.selectAll(".myArea").remove()
        chart.selectAll("myLayers")
            .data(yCoord)
            .join("path")
                .style("fill", d => colors(d.key))
                .attr("class", d => "myArea " + d.key)
                .attr("d", areas);
    };

    let slider;

    if (mode == Modes.DURATION) {
        const extent = d3.extent(data, d => new Date(d.date));
        slider = d3.sliderLeft()
            .min(extent[0])
            .max(extent[1])
            .height(HeightS / 3)
            .step(1000 * 60 * 60 * 24 * 365)
            .tickFormat(d3.timeFormat('%Y'))
            .ticks(4)
            .default(extent[1])
            .on('onchange', updateChart);
    }
    else if (mode == Modes.DATE) {
        const extent = d3.extent(data, d => d.duration);
        slider = d3.sliderLeft()
            .min(extent[0])
            .max(extent[1])
            .height(HeightS / 3)
            .tickFormat(d3.format('.5'))
            .ticks(4)
            .default(extent[1])
            .on('onchange', updateChart);
    }

    let g = svg.append("svg")
                .attr("width", WidthS + 200)
                .attr("height", HeightS)
                .style("color", Theme == Themes.DARK ? 
                    "#fff" : "#1b1e23")
            .append("g")
                .attr("transform", `translate(
                    ${WidthS + 90}, ${HeightS / 2})`)
                .attr("fill", Theme == Themes.DARK ? 
                    "lightsteelblue" : "steelblue");

    g.call(slider);
}


const addBrushing = (data, mode, x, areas, svg, chart, xAxis) => {
    let idleTimeout;

    const idled = () => { 
        idleTimeout = null; 
    };

    // Update the chart for given boundaries.
    const updateChart = (event, d) => {

        let extent = event.selection;

        // If no selection, back to initial coordinate. 
        // Otherwise, update X axis domain.
        if (! extent) {
            if (! idleTimeout) {
                return idleTimeout = setTimeout(idled, 350);
            }

            x.domain(d3.extent(data, d => d[mode]));
        }
        else {
            x.domain([x.invert(extent[0]), x.invert(extent[1])]);
            chart.select(".brush").call(brush.move, null);
        }

        // Update axis and area position.
        xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5));
        chart.selectAll("path")
            .transition()
                .duration(1000)
            .attr("d", areas);
    };

    // Add a clipPath: everything out of this area won't be drawn.
    const clip = svg.append("defs")
        .append("svg:clipPath")
            .attr("id", "clip")
        .append("svg:rect")
            .attr("width", WidthS)
            .attr("height", HeightS)
            .attr("x", 0)
            .attr("y", 0);

    const brush = d3.brushX()
        .extent([[0, 0], [WidthS, HeightS]])
        .on("end", updateChart);
    
    chart.append("g")
        .attr("class", "brush")
        .call(brush);
};


/**
 * Print a stacked graph for which the areas are the 
 * different transports of the dataset.
 * The x values are defined by "mode", and the part
 * of the dataset concerned is about the country
 * defined with "alpha2". 
 * @param {} alpha2 country code (e.g. FR for France).
 * @param {} mode define the x values.
 */
const printStackedGraph = (alpha2, mode) => {
    // Append the svg object to the body of the page.
    const { svg, chart } = createSvgS();

    // Parse data and create graph.
    d3.tsv("../data/missions.tsv", d => (
        {
            missionId: d['#mission_id'],
            userId: d.user_id,
            placeId: +d.place_id,
            date: d3.timeParse("%Y-%m-%d")(d.date),
            duration: +d.duration,
            modeTransport: d.mode,
            co2: +d.co2,
        }
    )).then(async data => {
        // We select only the data corresponding to the
        // given country.
        data = await filterCountry(alpha2, data);
        // Extract keys from dataset, a key being a mode
        // of transport.
        const { keys, colors } = defineKeys(data);
        // For each x value and each key, get the y value 
        // corresponding.
        const yCoord = extractCoordinatesS(data, mode, keys);
        // Get the chart scales.
        const { x, y } = getScales(data, mode, yCoord);
        // Print the graph. 
        const areas = printAreas(mode, keys, colors, x, y, yCoord, chart);
        const { xAxis, yAxis } = printAxes(mode, x, y, svg);
        printLegendS(mode, keys, colors, svg);
        // Add user interaction.
        addBrushing(data, mode, x, areas, svg, chart, xAxis);
        addSlider(data, mode, keys, colors, x, y, svg, chart);
    })
}